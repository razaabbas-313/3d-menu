// Dev-only stand-in for the Spring Boot API (same routes and JSON shapes, in-memory data).
// Run:  npm run mock   then   npm run dev   (Vite proxies /api and /uploads to port 8080).
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Busboy from 'busboy';

const PORT = process.env.PORT || 8080;
const DIR = path.join(process.cwd(), 'mock-api', '.uploads');
fs.mkdirSync(DIR, { recursive: true });

const users = []; const restaurants = []; const items = []; const events = [];
const tokens = new Map();
const uid = () => crypto.randomUUID();

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};
const err = (res, status, error) => send(res, status, { error });
const readJson = (req) => new Promise((ok) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch { ok({}); } }); });
const readFile = (req) => new Promise((ok, no) => {
  const bb = Busboy({ headers: req.headers, limits: { fileSize: 26 * 1024 * 1024 } });
  let chunks = []; let name = '';
  bb.on('file', (_f, stream, info) => { name = info.filename; stream.on('data', (c) => chunks.push(c)); });
  bb.on('close', () => ok({ buffer: Buffer.concat(chunks), name }));
  bb.on('error', no); req.pipe(bb);
});
const dto = (r) => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  tagline: r.tagline ?? null,
  city: r.city ?? null,
  currency: r.currency,
  accent: r.accent,
  coverUrl: r.coverUrl ?? null,
  published: r.published,
  instagram: r.instagram ?? null,
  whatsapp: r.whatsapp ?? null,
  phone: r.phone ?? null,
  tiktok: r.tiktok ?? null,
  facebook: r.facebook ?? null,
  website: r.website ?? null,
  googleMapsUrl: r.googleMapsUrl ?? null,
  wifiName: r.wifiName ?? null,
  wifiPassword: r.wifiPassword ?? null,
  theme: r.theme ?? 'dark'
});
const itemDto = (i) => ({ ...i, modelScale: i.modelScale ?? 1.0, modelPlacement: i.modelPlacement ?? 'plate', restaurantId: undefined });
const sniff = (b, kind) => {
  if (kind === 'model') return b.length >= 12 && b.slice(0, 4).toString() === 'glTF' ? 'glb' : null;
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b[0] === 0x89 && b.slice(1, 4).toString() === 'PNG') return 'png';
  if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return 'webp';
  return null;
};
const store = (buffer, ext) => { const n = `${uid()}.${ext}`; fs.writeFileSync(path.join(DIR, n), buffer); return `/uploads/${n}`; };
const drop = (u) => { if (u?.startsWith('/uploads/')) fs.rmSync(path.join(DIR, path.basename(u)), { force: true }); };
const SAMPLE = [
  ['The Truffle Royale', 'Signatures', 'Dry-aged beef, black truffle cream, aged cheddar, toasted brioche.', 2450, 'Halal', true, 'photo-1568901346375-23c9450c58cd'],
  ['Burrata Garden', 'Starters', 'Creamy burrata, heirloom tomato, basil oil and warm sourdough.', 1850, 'Vegetarian', false, 'photo-1608039829572-78524f79c4c7'],
  ['Charred Corn Ribs', 'Starters', 'Smoky sweetcorn, lime crema and smoked paprika.', 950, 'Vegetarian,Spicy', false, 'photo-1551754655-cd27e38d2076'],
  ['Saffron Sea Bass', 'Mains', 'Pan-seared sea bass, saffron beurre blanc and seasonal greens.', 3200, 'Halal,Gluten-free', true, 'photo-1519708227418-c8fd9a32b7a2'],
  ['Midnight Tiramisu', 'Desserts', 'Espresso-soaked ladyfingers, mascarpone and dark cocoa.', 1250, 'Vegetarian', true, 'photo-1571877227200-a0d98ea607e9'],
  ['Rosewater Pavlova', 'Desserts', 'Crisp meringue, rose cream, berries and pistachio.', 1100, 'Vegetarian,Gluten-free', false, 'photo-1488477181946-6428a0291777']
];

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'); const p = url.pathname; const m = req.method;
  try {
    if (p.startsWith('/uploads/')) {
      const f = path.join(DIR, path.basename(p));
      if (!fs.existsSync(f)) return err(res, 404, 'Not found.');
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' }); return fs.createReadStream(f).pipe(res);
    }
    if (!p.startsWith('/api/v1/')) return err(res, 404, 'Not found.');
    const r = p.slice(7);

    // public
    let mm = r.match(/^\/public\/menu\/([^/]+)(\/events)?$/);
    if (mm) {
      const rest = restaurants.find((x) => x.slug === mm[1] && x.published);
      if (!rest) return err(res, 404, 'This menu is not available.');
      if (mm[2] && m === 'POST') { const b = await readJson(req); events.push({ rid: rest.id, itemId: b.itemId, type: b.type, at: Date.now() }); return send(res, 204); }
      const list = items.filter((i) => i.restaurantId === rest.id && i.published).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
      const { id, published, ...pub } = dto(rest);
      return send(res, 200, { restaurant: pub, items: list.map(({ restaurantId, published, createdAt, modelFileName, ...i }) => ({ ...i, modelScale: i.modelScale ?? 1.0, modelPlacement: i.modelPlacement ?? 'plate' })) });
    }

    if (r === '/auth/register' && m === 'POST') {
      const b = await readJson(req);
      if (!b.email || !b.password || b.password.length < 8 || !b.restaurantName) return err(res, 400, 'password must be 8-100 characters');
      if (users.some((u) => u.email === b.email.toLowerCase())) return err(res, 409, 'An account with this email already exists. Try signing in.');
      const user = { id: uid(), email: b.email.toLowerCase(), password: b.password };
      let slug = b.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'restaurant';
      while (restaurants.some((x) => x.slug === slug)) slug += '-2';
      const rest = { id: uid(), ownerId: user.id, name: b.restaurantName, slug, city: b.city || null, tagline: null, currency: 'PKR', accent: 'cobalt', coverUrl: null, published: false, instagram: null, whatsapp: null, phone: null, tiktok: null, facebook: null, website: null, googleMapsUrl: null, wifiName: null, wifiPassword: null, theme: 'dark' };
      users.push(user); restaurants.push(rest);
      const t = uid(); tokens.set(t, user.id);
      return send(res, 201, { token: t, user: { id: user.id, email: user.email }, restaurant: dto(rest) });
    }
    if (r === '/auth/login' && m === 'POST') {
      const b = await readJson(req); const u = users.find((x) => x.email === (b.email || '').toLowerCase() && x.password === b.password);
      if (!u) return err(res, 401, 'Incorrect email or password.');
      const t = uid(); tokens.set(t, u.id);
      return send(res, 200, { token: t, user: { id: u.id, email: u.email }, restaurant: dto(restaurants.find((x) => x.ownerId === u.id)) });
    }

    // authenticated
    const userId = tokens.get((req.headers.authorization || '').replace('Bearer ', ''));
    if (!userId) return err(res, 401, 'Please sign in');
    const user = users.find((u) => u.id === userId); const rest = restaurants.find((x) => x.ownerId === userId);
    const mine = (id) => items.find((i) => i.id === id && i.restaurantId === rest.id);

    if (r === '/auth/me') return send(res, 200, { user: { id: user.id, email: user.email }, restaurant: dto(rest) });
    if (r === '/restaurant' && m === 'GET') return send(res, 200, dto(rest));
    if (r === '/restaurant' && m === 'PUT') {
      const b = await readJson(req);
      if (b.slug && b.slug.trim()) {
        const candidate = b.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'restaurant';
        if (candidate !== rest.slug && restaurants.some((x) => x.id !== rest.id && x.slug === candidate)) {
          return err(res, 409, `The web address /m/${candidate} is already taken by another restaurant.`);
        }
        rest.slug = candidate;
      }
      Object.assign(rest, {
        name: b.name,
        tagline: b.tagline || null,
        city: b.city || null,
        currency: b.currency || rest.currency,
        accent: b.accent || rest.accent,
        instagram: b.instagram || null,
        whatsapp: b.whatsapp || null,
        phone: b.phone || null,
        tiktok: b.tiktok || null,
        facebook: b.facebook || null,
        website: b.website || null,
        googleMapsUrl: b.googleMapsUrl || null,
        wifiName: b.wifiName || null,
        wifiPassword: b.wifiPassword || null,
        theme: b.theme || 'dark'
      });
      return send(res, 200, dto(rest));
    }
    if (r === '/restaurant/publish') {
      const v = url.searchParams.get('value') === 'true';
      if (v && !items.some((i) => i.restaurantId === rest.id)) return err(res, 400, 'Add at least one dish before publishing your menu.');
      rest.published = v; return send(res, 200, dto(rest));
    }
    if (r === '/restaurant/cover' && m === 'POST') {
      const f = await readFile(req); const ext = sniff(f.buffer, 'image'); if (!ext) return err(res, 400, 'Upload a JPG, PNG or WebP image.');
      drop(rest.coverUrl); rest.coverUrl = store(f.buffer, ext); return send(res, 200, dto(rest));
    }
    if (r === '/restaurant/cover' && m === 'DELETE') { drop(rest.coverUrl); rest.coverUrl = null; return send(res, 200, dto(rest)); }
    if (r === '/restaurant/sample-menu' && m === 'POST') {
      if (items.some((i) => i.restaurantId === rest.id)) return err(res, 409, 'Sample dishes can only be added to an empty menu.');
      SAMPLE.forEach(([name, category, description, price, tags, featured, photo]) => items.push({ id: uid(), restaurantId: rest.id, name, category, description, price, tags, featured, available: true, published: true, imageUrl: `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=900&q=80`, modelUrl: null, modelFileName: null, modelScale: 1.0, modelPlacement: 'plate', createdAt: new Date().toISOString() }));
      return send(res, 201, items.filter((i) => i.restaurantId === rest.id).map(itemDto));
    }
    if (r === '/items' && m === 'GET') return send(res, 200, items.filter((i) => i.restaurantId === rest.id).map(itemDto).reverse());
    if (r === '/items' && m === 'POST') {
      const b = await readJson(req); if (!b.name || typeof b.price !== 'number' || b.price < 0) return err(res, 400, 'name must not be blank');
      const it = { id: uid(), restaurantId: rest.id, name: b.name, category: b.category, description: b.description || null, price: b.price, tags: b.tags || null, featured: !!b.featured, available: b.available !== false, published: b.published !== false, imageUrl: b.imageUrl || null, modelUrl: null, modelFileName: null, modelScale: b.modelScale ?? 1.0, modelPlacement: b.modelPlacement || 'plate', createdAt: new Date().toISOString() };
      items.push(it); return send(res, 201, itemDto(it));
    }
    mm = r.match(/^\/items\/([^/]+)(\/(image|model|model-tuning))?$/);
    if (mm) {
      const it = mine(mm[1]); if (!it) return err(res, 404, 'Dish not found');
      if (mm[3] === 'model-tuning' && m === 'PATCH') {
        const sc = parseFloat(url.searchParams.get('scale'));
        const pl = url.searchParams.get('placement');
        if (!isNaN(sc) && sc >= 0.2 && sc <= 4.0) it.modelScale = sc;
        if (pl) it.modelPlacement = pl;
        return send(res, 200, itemDto(it));
      }
      if (!mm[2] && m === 'PUT') { const b = await readJson(req); if (it.imageUrl && it.imageUrl !== b.imageUrl) drop(it.imageUrl); Object.assign(it, { name: b.name, category: b.category, description: b.description || null, price: b.price, tags: b.tags || null, featured: !!b.featured, available: b.available !== false, published: b.published !== false, imageUrl: b.imageUrl || null, modelScale: b.modelScale ?? it.modelScale ?? 1.0, modelPlacement: b.modelPlacement || it.modelPlacement || 'plate' }); return send(res, 200, itemDto(it)); }
      if (!mm[2] && m === 'DELETE') { drop(it.imageUrl); drop(it.modelUrl); items.splice(items.indexOf(it), 1); return send(res, 204); }
      if (mm[3] === 'image' && m === 'POST') { const f = await readFile(req); const ext = sniff(f.buffer, 'image'); if (!ext) return err(res, 400, 'Upload a JPG, PNG or WebP image.'); drop(it.imageUrl); it.imageUrl = store(f.buffer, ext); return send(res, 200, itemDto(it)); }
      if (mm[3] === 'model' && m === 'POST') { const f = await readFile(req); if (!sniff(f.buffer, 'model')) return err(res, 400, 'This is not a valid .glb (glTF 2.0 binary) file. Export your model as GLB.'); drop(it.modelUrl); it.modelUrl = store(f.buffer, 'glb'); it.modelFileName = f.name; return send(res, 200, itemDto(it)); }
      if (mm[3] === 'model' && m === 'DELETE') { drop(it.modelUrl); it.modelUrl = null; it.modelFileName = null; return send(res, 200, itemDto(it)); }
    }
    if (r === '/analytics/summary') {
      const days = Math.min(90, Math.max(1, +url.searchParams.get('days') || 7)); const DAY = 864e5; const now = Date.now();
      const mine2 = events.filter((e) => e.rid === rest.id); const inW = (e, a, b) => e.at >= now - b * DAY && e.at < now - a * DAY + 1;
      const count = (t, a, b) => mine2.filter((e) => e.type === t && inW(e, a, b)).length; const d = (t) => ({ current: count(t, 0, days), previous: count(t, days, days * 2) });
      const series = Array.from({ length: days }, (_, k) => { const day = new Date(now - (days - 1 - k) * DAY); const key = day.toISOString().slice(0, 10); const on = (t) => mine2.filter((e) => e.type === t && new Date(e.at).toISOString().slice(0, 10) === key).length; return { date: key, scans: on('SCAN'), views: on('ITEM_VIEW'), arLaunches: on('AR_LAUNCH') }; });
      const per = {}; mine2.forEach((e) => { if (e.itemId && (e.type === 'ITEM_VIEW' || e.type === 'AR_LAUNCH')) { per[e.itemId] ??= { views: 0, arLaunches: 0 }; per[e.itemId][e.type === 'ITEM_VIEW' ? 'views' : 'arLaunches']++; } });
      const topItems = Object.entries(per).map(([id, v]) => ({ id, name: items.find((i) => i.id === id)?.name ?? '', ...v })).sort((a, b) => b.views + b.arLaunches - a.views - a.arLaunches).slice(0, 5);
      return send(res, 200, { days, scans: d('SCAN'), itemViews: d('ITEM_VIEW'), modelViews: d('MODEL_VIEW'), arLaunches: d('AR_LAUNCH'), series, topItems });
    }
    err(res, 404, 'Not found.');
  } catch (e) { console.error(e); err(res, 500, 'Mock server error.'); }
}).listen(PORT, () => console.log(`Mock Atelier AR API on http://localhost:${PORT}`));
