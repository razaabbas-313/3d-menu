import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Box,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Instagram,
  MapPin,
  MessageCircle,
  Minus,
  Monitor,
  Phone,
  Plus,
  QrCode,
  Search,
  Share2,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Trash2,
  Wifi,
  X
} from 'lucide-react';
import { api, assetUrl, PublicItem, PublicMenu, PublicRestaurant } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money, parseTags, sortCategories } from '../lib/format';
import { Link, navigate, useLocation } from '../lib/router';
import { accentStyle } from '../lib/theme';
import { errorMessage, useToast } from '../lib/toast';
import { Button, Chip, Dialog, EmptyState, Logo, Photo, Spinner } from '../components/ui';
import { ModelViewer, ModelViewerHandle, PlatePlacement } from '../components/ModelViewer';
import { useMenu } from './dashboard/menuStore';

export type OrderEntry = { item: PublicItem; count: number; notes?: string };

/** The guest menu. "public" is what a QR scan opens; "preview" shows the owner the same page before publishing. */
export function Guest({ mode, slug }: { mode: 'public' | 'preview'; slug?: string }) {
  return mode === 'preview' ? <GuestPreview /> : <GuestPublic slug={slug ?? ''} />;
}

function GuestPublic({ slug }: { slug: string }) {
  const [data, setData] = useState<PublicMenu | null>(null);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    api
      .publicMenu(slug)
      .then((m) => {
        if (cancelled) return;
        setData(m);
        document.title = `${m.restaurant.name} | 3D Digital Menu`;
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 404) setMissing(true);
        else setError(errorMessage(e, 'Could not load this menu.'));
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (missing) {
    return (
      <div className="guest guest-dark guest-center">
        <EmptyState
          title="This menu is not available"
          text="The restaurant may not have published it yet, or the web address may have changed. Please ask your server."
        />
      </div>
    );
  }
  if (error) {
    return (
      <div className="guest guest-dark guest-center">
        <EmptyState
          title="Could not load the menu"
          text={error}
          action={<Button onClick={() => window.location.reload()}>Try again</Button>}
        />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="guest guest-dark guest-center">
        <Spinner label="Opening dining menu…" />
      </div>
    );
  }
  return <GuestView restaurant={data.restaurant} items={data.items} slug={slug} />;
}

function GuestPreview() {
  const { restaurant } = useAuth();
  const menu = useMenu();
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'full'>('mobile');

  if (!restaurant) return null;
  if (menu.status === 'loading') {
    return (
      <div className="guest guest-dark guest-center">
        <Spinner label="Loading preview…" />
      </div>
    );
  }

  const items: PublicItem[] = menu.items.filter((i) => i.published);

  return (
    <div className="preview-container">
      {/* Top Preview Controls Bar */}
      <header className="preview-topbar">
        <div className="preview-topbar-left">
          <Button size="sm" icon={<ArrowLeft size={15} />} onClick={() => navigate('/app')}>
            Back to dashboard
          </Button>
          <span className="preview-status-pill">
            {restaurant.published ? '🟢 Live Menu Preview' : '🟡 Draft Preview (Unpublished)'}
          </span>
        </div>

        <div className="preview-topbar-center">
          <div className="device-switcher" role="tablist" aria-label="Device view switcher">
            <button
              type="button"
              className={`dev-btn ${deviceMode === 'mobile' ? 'on' : ''}`}
              onClick={() => setDeviceMode('mobile')}
            >
              <Smartphone size={14} />
              <span>iPhone View</span>
            </button>
            <button
              type="button"
              className={`dev-btn ${deviceMode === 'full' ? 'on' : ''}`}
              onClick={() => setDeviceMode('full')}
            >
              <Monitor size={14} />
              <span>Full Screen</span>
            </button>
          </div>
        </div>

        <div className="preview-topbar-right">
          {restaurant.published && (
            <a
              href={`/m/${restaurant.slug}`}
              target="_blank"
              rel="noreferrer"
              className="preview-link-btn"
              title="Open public menu in a new tab"
            >
              <span>/m/{restaurant.slug}</span>
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </header>

      {/* Main Preview Stage */}
      {deviceMode === 'mobile' ? (
        <div className="preview-device-stage">
          <div className="iphone-frame">
            <div className="iphone-notch">
              <span className="iphone-speaker" />
              <span className="iphone-camera" />
            </div>
            <div className="iphone-screen">
              <GuestView restaurant={restaurant} items={items} preview published={restaurant.published} isFramed />
            </div>
            <div className="iphone-home-bar" />
          </div>
        </div>
      ) : (
        <div className="preview-full-wrapper">
          <GuestView restaurant={restaurant} items={items} preview published={restaurant.published} />
        </div>
      )}
    </div>
  );
}

type ViewProps = {
  restaurant: PublicRestaurant;
  items: PublicItem[];
  slug?: string;
  preview?: boolean;
  published?: boolean;
  isFramed?: boolean;
};

type FilterKey = 'all' | 'featured' | '3d' | 'veg' | 'halal' | 'spicy' | 'gluten-free';

function GuestView({ restaurant, items, slug, preview, isFramed }: ViewProps) {
  const toast = useToast();
  const { search } = useLocation();
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selected, setSelected] = useState<PublicItem | null>(null);
  const [showWifi, setShowWifi] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copiedWifi, setCopiedWifi] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Table Order / Wishlist state
  const [order, setOrder] = useState<Record<string, OrderEntry>>({});
  const [orderOpen, setOrderOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);

  const track = (type: 'SCAN' | 'ITEM_VIEW' | 'MODEL_VIEW' | 'AR_LAUNCH', itemId?: string) => {
    if (slug && !preview) void api.track(slug, type, itemId);
  };

  const categories = useMemo(() => sortCategories(items.map((i) => i.category)), [items]);
  const q = query.trim().toLowerCase();

  const filterMatches = (i: PublicItem) => {
    if (filter === 'featured') return i.featured;
    if (filter === '3d') return Boolean(i.modelUrl);
    const tags = parseTags(i.tags).map((t) => t.toLowerCase());
    if (filter === 'veg') return tags.some((t) => t.includes('veg'));
    if (filter === 'halal') return tags.some((t) => t.includes('halal'));
    if (filter === 'spicy') return tags.some((t) => t.includes('spic') || t.includes('chili') || t.includes('hot'));
    if (filter === 'gluten-free') return tags.some((t) => t.includes('gluten') || t.includes('gf'));
    return true;
  };

  const searchMatches = (i: PublicItem) =>
    !q || `${i.name} ${i.description ?? ''} ${i.tags ?? ''} ${i.category}`.toLowerCase().includes(q);

  const visibleItems = items.filter((i) => searchMatches(i) && filterMatches(i));
  const featured = items.filter((i) => i.featured && searchMatches(i) && (filter === 'all' || filter === 'featured'));

  const groups = categories
    .map((c) => ({
      name: c,
      items: visibleItems.filter((i) => i.category === c)
    }))
    .filter((g) => g.items.length > 0);

  // One "scan" per browser session
  useEffect(() => {
    if (!slug || preview) return;
    const key = `atelier.scan.${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* storage unavailable: count it anyway */
    }
    void api.track(slug, 'SCAN');
  }, [slug, preview]);

  // Deep link from the studio's phone-test QR code: /m/slug?dish=<id>
  const deepLinked = useRef(false);
  useEffect(() => {
    const id = search.get('dish');
    if (!id || deepLinked.current) return;
    const found = items.find((i) => i.id === id);
    if (found) {
      deepLinked.current = true;
      open(found);
    }
  }, [items, search]);

  // Highlight the category tab for the section currently in view.
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('[data-cat]');
    if (!sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveCat((visible.target as HTMLElement).dataset.cat ?? '');
      },
      { rootMargin: '-120px 0px -65% 0px' }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [groups.length, q, filter]);

  function open(item: PublicItem) {
    setSelected(item);
    track('ITEM_VIEW', item.id);
  }

  // Order management helpers
  const addToOrder = (item: PublicItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOrder((prev) => {
      const current = prev[item.id];
      const count = current ? current.count + 1 : 1;
      return { ...prev, [item.id]: { item, count, notes: current?.notes ?? '' } };
    });
    toast.success(`Added ${item.name} to order`);
  };

  const updateCount = (itemId: string, delta: number) => {
    setOrder((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      const newCount = current.count + delta;
      if (newCount <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: { ...current, count: newCount } };
    });
  };

  const orderList = Object.values(order);
  const totalItemsCount = orderList.reduce((sum, entry) => sum + entry.count, 0);
  const totalOrderAmount = orderList.reduce((sum, entry) => sum + entry.count * entry.item.price, 0);

  const jump = (c: string) => {
    const el = document.querySelector(`[data-cat="${CSS.escape(c)}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const copyWifi = () => {
    if (restaurant.wifiPassword) {
      void navigator.clipboard.writeText(restaurant.wifiPassword);
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2200);
      toast.success('Wi-Fi password copied!');
    }
  };

  const copyMenuLink = () => {
    const url = window.location.href;
    void navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2200);
    toast.success('Menu link copied to clipboard!');
  };

  const cleanHandle = (h?: string | null) => (h ? h.replace(/^@/, '').trim() : '');
  const cleanPhone = (p?: string | null) => (p ? p.replace(/\D/g, '') : '');

  const cur = restaurant.currency || 'USD';

  // Construct WhatsApp Order Message
  const sendWhatsAppOrder = () => {
    if (!restaurant.whatsapp) return;
    const phone = cleanPhone(restaurant.whatsapp);
    let msg = `🍽️ *New Order for ${restaurant.name}*\n`;
    if (tableNumber.trim()) msg += `📍 Table: *${tableNumber.trim()}*\n`;
    msg += `─────────────────────────\n`;
    orderList.forEach((e) => {
      msg += `• ${e.count}x ${e.item.name} (${money(e.item.price * e.count, cur)})\n`;
    });
    msg += `─────────────────────────\n`;
    msg += `💵 *Total Bill: ${money(totalOrderAmount, cur)}*\n`;
    if (orderNotes.trim()) msg += `📝 *Notes:* ${orderNotes.trim()}\n`;
    msg += `\n_Sent via Atelier AR 3D Menu_`;

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`guest guest-dark ${isFramed ? 'is-framed' : ''}`} style={accentStyle(restaurant.accent)}>
      {/* Hero Header */}
      <header
        className="g-hero"
        style={
          restaurant.coverUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(11,15,23,0.3) 0%, rgba(11,15,23,0.85) 65%, rgba(11,15,23,1) 100%), url(${assetUrl(
                  restaurant.coverUrl
                )})`
              }
            : undefined
        }
      >
        <div className="g-hero-top-actions">
          <button type="button" className="g-action-pill" onClick={() => setShowShare(true)} aria-label="Share Menu">
            <Share2 size={14} />
            <span>Share</span>
          </button>
          {(restaurant.wifiName || restaurant.wifiPassword) && (
            <button
              type="button"
              className="g-action-pill g-wifi-pill"
              onClick={() => setShowWifi(true)}
              aria-label="Guest Wi-Fi"
            >
              <Wifi size={14} />
              <span>Wi-Fi</span>
            </button>
          )}
        </div>

        <div className="g-hero-in">
          {restaurant.city && (
            <span className="g-city">
              <MapPin size={13} />
              {restaurant.city}
            </span>
          )}
          <h1 className="g-name">{restaurant.name}</h1>
          {restaurant.tagline && <p className="g-tagline">{restaurant.tagline}</p>}

          {/* Social Media & Marketing Quick Bar */}
          <div className="g-social-bar" aria-label="Restaurant links and social channels">
            {restaurant.instagram && (
              <a
                href={`https://instagram.com/${cleanHandle(restaurant.instagram)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="g-social-pill"
                title={`Follow on Instagram: @${cleanHandle(restaurant.instagram)}`}
              >
                <Instagram size={14} />
                <span>@{cleanHandle(restaurant.instagram)}</span>
              </a>
            )}
            {restaurant.whatsapp && (
              <a
                href={`https://wa.me/${cleanPhone(restaurant.whatsapp)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="g-social-pill g-social-wa"
                title="Message on WhatsApp"
              >
                <MessageCircle size={14} />
                <span>WhatsApp</span>
              </a>
            )}
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="g-social-pill" title={`Call ${restaurant.phone}`}>
                <Phone size={14} />
                <span>Call</span>
              </a>
            )}
            {restaurant.googleMapsUrl && (
              <a
                href={
                  restaurant.googleMapsUrl.startsWith('http')
                    ? restaurant.googleMapsUrl
                    : `https://maps.google.com/?q=${encodeURIComponent(restaurant.googleMapsUrl)}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="g-social-pill g-social-maps"
                title="Google Maps Location & Reviews"
              >
                <MapPin size={14} />
                <span>Reviews & Map</span>
              </a>
            )}
            {restaurant.website && (
              <a
                href={restaurant.website.startsWith('http') ? restaurant.website : `https://${restaurant.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="g-social-pill"
                title="Official Website"
              >
                <Globe size={14} />
                <span>Website</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Sticky Search & Navigation Bar */}
      <div className="g-bar">
        <label className="g-search">
          <Search size={16} aria-hidden />
          <input
            type="search"
            placeholder="Search appetizers, steaks, cocktails…"
            aria-label="Search the menu"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="g-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </label>

        {/* Quick Filter Badges (3D, Specials, Dietary) */}
        <div className="g-filter-bar" role="tablist" aria-label="Quick filters">
          <button
            type="button"
            className={`g-filter-chip ${filter === 'all' ? 'on' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`g-filter-chip g-filter-3d ${filter === '3d' ? 'on' : ''}`}
            onClick={() => setFilter('3d')}
          >
            <Box size={13} />
            <span>3D & AR</span>
          </button>
          <button
            type="button"
            className={`g-filter-chip ${filter === 'featured' ? 'on' : ''}`}
            onClick={() => setFilter('featured')}
          >
            <Sparkles size={13} />
            <span>Specials</span>
          </button>
          <button
            type="button"
            className={`g-filter-chip ${filter === 'veg' ? 'on' : ''}`}
            onClick={() => setFilter('veg')}
          >
            🌱 Vegetarian
          </button>
          <button
            type="button"
            className={`g-filter-chip ${filter === 'halal' ? 'on' : ''}`}
            onClick={() => setFilter('halal')}
          >
            Halal
          </button>
          <button
            type="button"
            className={`g-filter-chip ${filter === 'spicy' ? 'on' : ''}`}
            onClick={() => setFilter('spicy')}
          >
            🌶️ Spicy
          </button>
          <button
            type="button"
            className={`g-filter-chip ${filter === 'gluten-free' ? 'on' : ''}`}
            onClick={() => setFilter('gluten-free')}
          >
            Gluten-Free
          </button>
        </div>

        {/* Category Pills */}
        {groups.length > 1 && (
          <nav className="g-tabs" aria-label="Menu sections">
            {groups.map((g) => (
              <button
                key={g.name}
                type="button"
                className={activeCat === g.name ? 'on' : ''}
                onClick={() => jump(g.name)}
              >
                {g.name}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Main Dishes Stream */}
      <main className="g-main">
        {items.length === 0 && (
          <EmptyState title="The menu is being prepared" text="Dishes will appear here soon." />
        )}
        {items.length > 0 && groups.length === 0 && (
          <EmptyState
            title="Nothing matches your filters"
            text="Try clearing the search or choosing another filter tag."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setFilter('all');
                }}
              >
                Reset filters
              </Button>
            }
          />
        )}

        {/* Featured Showcase */}
        {featured.length > 0 && !q && filter === 'all' && (
          <section className="g-featured" aria-label="Chef's signature plates">
            <div className="g-featured-head">
              <h2>Signature Creations</h2>
              <span className="g-featured-sub">Chef's recommended highlights</span>
            </div>
            <div className="g-rail">
              {featured.map((i) => (
                <div
                  key={i.id}
                  className="g-feature-card"
                  onClick={() => open(i)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${i.name}, ${money(i.price, cur)}`}
                >
                  <div className="g-feature-img">
                    <Photo src={assetUrl(i.imageUrl)} alt={i.name} />
                    {i.modelUrl && (
                      <span className="badge-3d badge-3d-glow">
                        <Box size={12} />
                        <span>3D & AR</span>
                      </span>
                    )}
                    <span className="g-card-price">{money(i.price, cur)}</span>
                  </div>
                  <div className="g-feature-info">
                    <strong>{i.name}</strong>
                    {i.description && <p>{i.description}</p>}
                    <div className="g-card-actions">
                      <button
                        type="button"
                        className="btn-add-quick"
                        onClick={(e) => addToOrder(i, e)}
                        title="Add to table order"
                      >
                        <Plus size={14} />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Categorized Sections */}
        {groups.map((g) => (
          <section key={g.name} data-cat={g.name} className="g-section">
            <div className="g-section-head">
              <h2>{g.name}</h2>
              <span className="g-section-count">{g.items.length} dishes</span>
            </div>
            <ul className="g-dish-list">
              {g.items.map((i) => {
                const inOrder = order[i.id];
                return (
                  <li key={i.id}>
                    <div
                      className={`g-row ${i.available ? '' : 'sold'}`}
                      onClick={() => open(i)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="g-row-text">
                        <div className="g-row-title">
                          <strong>{i.name}</strong>
                          {i.modelUrl && (
                            <span className="badge-3d-inline">
                              <Box size={12} />
                              3D
                            </span>
                          )}
                        </div>
                        {i.description && <p className="g-desc">{i.description}</p>}
                        <div className="g-meta">
                          <b className="g-price">{money(i.price, cur)}</b>
                          {!i.available && <Chip tone="chili">Sold out</Chip>}
                          {parseTags(i.tags)
                            .slice(0, 3)
                            .map((t) => (
                              <span key={t} className="g-diet-tag">
                                {t}
                              </span>
                            ))}
                        </div>
                        {/* Order Add Button */}
                        <div className="g-row-order-ctrl" onClick={(e) => e.stopPropagation()}>
                          {inOrder ? (
                            <div className="order-counter">
                              <button
                                type="button"
                                className="counter-btn"
                                onClick={() => updateCount(i.id, -1)}
                                aria-label="Decrease quantity"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="counter-val">{inOrder.count}</span>
                              <button
                                type="button"
                                className="counter-btn"
                                onClick={() => updateCount(i.id, 1)}
                                aria-label="Increase quantity"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn-add-pill"
                              onClick={(e) => addToOrder(i, e)}
                              disabled={!i.available}
                            >
                              <Plus size={14} />
                              <span>Add to order</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="g-row-img-wrap">
                        <Photo src={assetUrl(i.imageUrl)} alt={i.name} />
                        {i.modelUrl && (
                          <span className="badge-3d badge-3d-corner">
                            <Box size={11} />
                            3D
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>

      {/* Floating "My Table Order" Bar */}
      {totalItemsCount > 0 && (
        <div className="floating-order-bar">
          <div className="floating-order-in" onClick={() => setOrderOpen(true)} role="button" tabIndex={0}>
            <div className="order-summary-chip">
              <ShoppingBag size={18} />
              <span className="order-badge">{totalItemsCount}</span>
            </div>
            <div className="order-summary-text">
              <strong>My Table Order</strong>
              <span>
                {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} · {money(totalOrderAmount, cur)}
              </span>
            </div>
            <button
              type="button"
              className="btn-view-order"
              onClick={(e) => {
                e.stopPropagation();
                setOrderOpen(true);
              }}
            >
              View Order →
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="g-foot">
        <Link to="/" className="g-credit">
          <Logo size={20} />
          <span>Interactive 3D Menu crafted with Atelier AR</span>
        </Link>
      </footer>

      {/* Dish Detailed Sheet with 3D Plate Staging */}
      <DishSheet
        item={selected}
        currency={cur}
        onClose={() => setSelected(null)}
        onModelView={(id) => track('MODEL_VIEW', id)}
        onAr={(id) => track('AR_LAUNCH', id)}
        onAddToOrder={(i) => addToOrder(i)}
      />

      {/* Table Order Modal Drawer */}
      <Dialog
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        variant="sheet"
        label="My Table Order"
        className="order-dialog"
      >
        <div className="order-sheet">
          <div className="order-sheet-head">
            <div className="order-sheet-title">
              <ShoppingBag size={20} />
              <h2>My Table Order</h2>
            </div>
            <button type="button" className="sheet-close-btn" onClick={() => setOrderOpen(false)} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div className="order-sheet-body">
            {orderList.length === 0 ? (
              <EmptyState
                title="Your order is empty"
                text="Tap '+ Add' on any dish to place it into your table order."
                action={
                  <Button size="sm" onClick={() => setOrderOpen(false)}>
                    Browse Menu
                  </Button>
                }
              />
            ) : (
              <>
                {/* Table Number Prompt */}
                <div className="table-number-row">
                  <label htmlFor="table-num-input">Table Number / Location:</label>
                  <input
                    id="table-num-input"
                    type="text"
                    placeholder="e.g. Table 4, Patio 2"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                  />
                </div>

                {/* Ordered Items List */}
                <div className="order-item-list">
                  {orderList.map(({ item, count }) => (
                    <div key={item.id} className="order-item-row">
                      <div className="order-item-info">
                        <strong>{item.name}</strong>
                        <span className="order-item-sub">
                          {count} × {money(item.price, cur)} = <b>{money(item.price * count, cur)}</b>
                        </span>
                      </div>
                      <div className="order-item-actions">
                        <button
                          type="button"
                          className="counter-btn"
                          onClick={() => updateCount(item.id, -1)}
                          aria-label="Decrease"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="counter-val">{count}</span>
                        <button
                          type="button"
                          className="counter-btn"
                          onClick={() => updateCount(item.id, 1)}
                          aria-label="Increase"
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          type="button"
                          className="item-delete-btn"
                          onClick={() => updateCount(item.id, -count)}
                          aria-label="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Optional Special Instructions */}
                <div className="order-notes-wrap">
                  <label htmlFor="order-notes">Special Requests / Allergies:</label>
                  <textarea
                    id="order-notes"
                    placeholder="e.g. Dressing on side, extra spice, water with lemon…"
                    rows={2}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                  />
                </div>

                {/* Total Calculation */}
                <div className="order-total-block">
                  <div className="total-row">
                    <span>Subtotal</span>
                    <b>{money(totalOrderAmount, cur)}</b>
                  </div>
                  <div className="total-row grand-total">
                    <strong>Estimated Total</strong>
                    <strong>{money(totalOrderAmount, cur)}</strong>
                  </div>
                </div>

                {/* Order Submission Actions */}
                <div className="order-actions-grid">
                  {restaurant.whatsapp ? (
                    <Button
                      variant="accent"
                      className="btn-order-wa"
                      icon={<MessageCircle size={18} />}
                      onClick={sendWhatsAppOrder}
                    >
                      Send Order via WhatsApp
                    </Button>
                  ) : null}

                  <Button
                    variant="secondary"
                    className="btn-order-receipt"
                    icon={<QrCode size={16} />}
                    onClick={() => setShowReceipt(true)}
                  >
                    Show Order to Waiter
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Dialog>

      {/* Show to Waiter High-Contrast Receipt Card */}
      <Dialog
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
        variant="modal"
        label="Table Order Summary"
        className="receipt-dialog"
      >
        <div className="receipt-card">
          <div className="receipt-card-head">
            <h3>{restaurant.name}</h3>
            <p>Table Order Summary</p>
            {tableNumber.trim() && <span className="receipt-table-badge">Table: {tableNumber.trim()}</span>}
          </div>
          <div className="receipt-items">
            {orderList.map(({ item, count }) => (
              <div key={item.id} className="receipt-row">
                <span>
                  {count}x {item.name}
                </span>
                <b>{money(item.price * count, cur)}</b>
              </div>
            ))}
          </div>
          {orderNotes.trim() && (
            <div className="receipt-note">
              <strong>Note:</strong> {orderNotes.trim()}
            </div>
          )}
          <div className="receipt-total">
            <span>Total</span>
            <b>{money(totalOrderAmount, cur)}</b>
          </div>
          <div className="receipt-actions">
            <Button size="sm" onClick={() => setShowReceipt(false)}>
              Done
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Guest Wi-Fi Modal */}
      <Dialog
        open={showWifi}
        onClose={() => setShowWifi(false)}
        variant="modal"
        label="Guest Wi-Fi"
        className="wifi-dialog"
      >
        <div className="wifi-modal-content">
          <div className="wifi-modal-icon">
            <Wifi size={32} />
          </div>
          <h3>Complimentary Guest Wi-Fi</h3>
          <p className="wifi-sub">Fast internet connection while you dine at {restaurant.name}.</p>

          <div className="wifi-info-box">
            {restaurant.wifiName && (
              <div className="wifi-field">
                <span className="wifi-label">Network Name (SSID)</span>
                <strong className="wifi-value">{restaurant.wifiName}</strong>
              </div>
            )}
            {restaurant.wifiPassword && (
              <div className="wifi-field">
                <span className="wifi-label">Password</span>
                <div className="wifi-pwd-row">
                  <code className="wifi-pwd">{restaurant.wifiPassword}</code>
                  <Button
                    size="sm"
                    variant={copiedWifi ? 'primary' : 'secondary'}
                    icon={copiedWifi ? <Check size={14} /> : <Copy size={14} />}
                    onClick={copyWifi}
                  >
                    {copiedWifi ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="wifi-modal-foot">
            <Button size="sm" onClick={() => setShowWifi(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Share Menu Modal */}
      <Dialog
        open={showShare}
        onClose={() => setShowShare(false)}
        variant="modal"
        label="Share Menu"
        className="share-dialog"
      >
        <div className="share-modal-content">
          <div className="share-modal-icon">
            <Share2 size={28} />
          </div>
          <h3>Share {restaurant.name}</h3>
          <p className="share-sub">Share this 3D menu with guests at your table or on your socials.</p>

          <div className="share-url-row">
            <input type="text" readOnly value={window.location.href} className="share-input" />
            <Button
              size="sm"
              variant={copiedUrl ? 'primary' : 'secondary'}
              icon={copiedUrl ? <Check size={14} /> : <Copy size={14} />}
              onClick={copyMenuLink}
            >
              {copiedUrl ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <div className="share-social-grid">
            {restaurant.instagram && (
              <a
                href={`https://instagram.com/${cleanHandle(restaurant.instagram)}`}
                target="_blank"
                rel="noreferrer"
                className="share-social-btn"
              >
                <Instagram size={16} />
                <span>Instagram</span>
              </a>
            )}
            {restaurant.whatsapp && (
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Check out the 3D menu for ${restaurant.name}: ${window.location.href}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="share-social-btn"
              >
                <MessageCircle size={16} />
                <span>WhatsApp</span>
              </a>
            )}
          </div>

          <div className="share-modal-foot">
            <Button size="sm" onClick={() => setShowShare(false)}>
              Done
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function DishSheet({
  item,
  currency,
  onClose,
  onModelView,
  onAr,
  onAddToOrder
}: {
  item: PublicItem | null;
  currency: string;
  onClose: () => void;
  onModelView: (id: string) => void;
  onAr: (id: string) => void;
  onAddToOrder: (item: PublicItem) => void;
}) {
  const viewer = useRef<ModelViewerHandle>(null);
  const [arHint, setArHint] = useState(false);
  const [last, setLast] = useState<PublicItem | null>(null);

  useEffect(() => {
    if (item) {
      setLast(item);
      setArHint(false);
    }
  }, [item]);

  const shown = item ?? last;

  return (
    <Dialog open={Boolean(item)} onClose={onClose} variant="sheet" label={shown?.name ?? 'Dish'}>
      {shown && (
        <div className="sheet sheet-dark">
          <button className="sheet-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>

          {/* 3D Staged Dish Container */}
          <div className="stage stage-guest">
            {shown.modelUrl ? (
              <ModelViewer
                ref={viewer}
                className="stage-model"
                src={assetUrl(shown.modelUrl)!}
                alt={`3D model of ${shown.name}`}
                scale={shown.modelScale ?? 1.0}
                placement={(shown.modelPlacement as PlatePlacement) || 'plate'}
                showControls={true}
                onLoad={() => onModelView(shown.id)}
              />
            ) : (
              <div className="stage-photo">
                <Photo src={assetUrl(shown.imageUrl)} alt={shown.name} />
              </div>
            )}
          </div>

          {/* Dish Information & Action Details */}
          <div className="sheet-body">
            <div className="sheet-title">
              <h2>{shown.name}</h2>
              <b className="sheet-price">{money(shown.price, currency)}</b>
            </div>

            <div className="sheet-tags">
              {!shown.available && <Chip tone="chili">Sold out</Chip>}
              {parseTags(shown.tags).map((t) => (
                <span key={t} className="g-diet-tag">
                  {t}
                </span>
              ))}
            </div>

            {shown.description && <p className="sheet-desc">{shown.description}</p>}

            {/* Quick Add to Table Order */}
            <div className="sheet-order-row">
              <Button
                variant="primary"
                size="md"
                className="btn-sheet-order"
                icon={<ShoppingBag size={18} />}
                disabled={!shown.available}
                onClick={() => {
                  onAddToOrder(shown);
                  onClose();
                }}
              >
                Add to My Table Order · {money(shown.price, currency)}
              </Button>
            </div>

            {/* AR Button */}
            {shown.modelUrl ? (
              <div className="sheet-ar-wrap">
                <Button
                  variant="accent"
                  className="sheet-ar"
                  icon={<Smartphone size={18} />}
                  onClick={() => {
                    onAr(shown.id);
                    if (viewer.current?.canActivateAR) viewer.current.activateAR();
                    else setArHint(true);
                  }}
                >
                  View on your table (AR)
                </Button>
                <p className="sheet-hint" role={arHint ? 'alert' : undefined}>
                  {arHint
                    ? 'AR requires a mobile browser with WebXR or AR Quick Look (iOS/Android).'
                    : 'Pinch to zoom · Drag with finger to rotate 360°'}
                </p>
              </div>
            ) : (
              <p className="sheet-hint">A photorealistic 3D presentation of this dish will be plated soon.</p>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
