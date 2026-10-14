import { FormEvent, useRef, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  ImagePlus,
  LogOut,
  Palette,
  Save,
  Share2,
  Sparkles,
  Store,
  Trash2,
  Wifi
} from 'lucide-react';
import { Accent, api, assetUrl, publicMenuUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { CURRENCIES, initials } from '../../lib/format';
import { ACCENTS, accentStyle } from '../../lib/theme';
import { errorMessage, useToast } from '../../lib/toast';
import { Button, CustomSelect, Field, Input, Textarea } from '../../components/ui';
import { PageHeader } from './Shell';

export function SettingsPage() {
  const { restaurant, user, setRestaurant, signOut } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(restaurant?.name ?? '');
  const [slug, setSlug] = useState(restaurant?.slug ?? '');
  const [city, setCity] = useState(restaurant?.city ?? '');
  const [tagline, setTagline] = useState(restaurant?.tagline ?? '');
  const [currency, setCurrency] = useState(restaurant?.currency ?? 'PKR');
  const [accent, setAccent] = useState<Accent>(restaurant?.accent ?? 'cobalt');
  const [instagram, setInstagram] = useState(restaurant?.instagram ?? '');
  const [whatsapp, setWhatsapp] = useState(restaurant?.whatsapp ?? '');
  const [phone, setPhone] = useState(restaurant?.phone ?? '');
  const [tiktok, setTiktok] = useState(restaurant?.tiktok ?? '');
  const [facebook, setFacebook] = useState(restaurant?.facebook ?? '');
  const [website, setWebsite] = useState(restaurant?.website ?? '');
  const [googleMapsUrl, setGoogleMapsUrl] = useState(restaurant?.googleMapsUrl ?? '');
  const [wifiName, setWifiName] = useState(restaurant?.wifiName ?? '');
  const [wifiPassword, setWifiPassword] = useState(restaurant?.wifiPassword ?? '');
  const [theme, setTheme] = useState(restaurant?.theme ?? 'dark');
  const [saving, setSaving] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const cover = useRef<HTMLInputElement>(null);

  if (!restaurant) return null;

  const dirty =
    name !== restaurant.name ||
    slug !== restaurant.slug ||
    city !== (restaurant.city ?? '') ||
    tagline !== (restaurant.tagline ?? '') ||
    currency !== restaurant.currency ||
    accent !== restaurant.accent ||
    instagram !== (restaurant.instagram ?? '') ||
    whatsapp !== (restaurant.whatsapp ?? '') ||
    phone !== (restaurant.phone ?? '') ||
    tiktok !== (restaurant.tiktok ?? '') ||
    facebook !== (restaurant.facebook ?? '') ||
    website !== (restaurant.website ?? '') ||
    googleMapsUrl !== (restaurant.googleMapsUrl ?? '') ||
    wifiName !== (restaurant.wifiName ?? '') ||
    wifiPassword !== (restaurant.wifiPassword ?? '') ||
    theme !== (restaurant.theme ?? 'dark');

  const syncSlugFromName = () => {
    const candidate = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'restaurant';
    setSlug(candidate);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicMenuUrl(slug || restaurant.slug));
      setCopied(true);
      toast.success('Live menu URL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy to clipboard.');
    }
  };

  async function save(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) return setError('Your restaurant needs a name.');
    if (!slug.trim()) return setError('Please specify a menu web address (slug).');
    setError('');
    setSaving(true);
    try {
      setRestaurant(
        await api.updateRestaurant({
          name: name.trim(),
          slug: slug.trim(),
          city: city.trim(),
          tagline: tagline.trim(),
          currency,
          accent,
          instagram: instagram.trim(),
          whatsapp: whatsapp.trim(),
          phone: phone.trim(),
          tiktok: tiktok.trim(),
          facebook: facebook.trim(),
          website: website.trim(),
          googleMapsUrl: googleMapsUrl.trim(),
          wifiName: wifiName.trim(),
          wifiPassword: wifiPassword.trim(),
          theme
        })
      );
      toast.success('Settings and menu URL saved successfully.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function changeCover(file: File | undefined) {
    if (!file) return;
    setCoverBusy(true);
    try {
      setRestaurant(await api.uploadCover(file));
      toast.success('Cover photo updated.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCoverBusy(false);
    }
  }

  async function removeCover() {
    setCoverBusy(true);
    try {
      setRestaurant(await api.removeCover());
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCoverBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Restaurant profile, menu URL, branding, and guest marketing links."
        actions={
          <Button
            variant="primary"
            onClick={() => save()}
            loading={saving}
            disabled={!dirty}
            icon={<Save size={16} />}
            className="settings-top-save-btn"
          >
            Save changes
          </Button>
        }
      />

      <div className="settings">
        <form className="panel settings-main-panel" onSubmit={save} noValidate>
          {/* Section 1: Profile & Web Address */}
          <div className="settings-section-head">
            <div className="settings-section-icon">
              <Store size={18} />
            </div>
            <div className="settings-section-titles">
              <h2>Restaurant Profile & Web Address</h2>
              <p>Your restaurant identity and direct QR menu address</p>
            </div>
          </div>

          <div className="form-row">
            <Field label="Restaurant name">
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </Field>
            <Field label="City">
              <Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} placeholder="Karachi" />
            </Field>
          </div>

          <Field
            label="Menu Web Address (Slug)"
            hint={
              <span>
                Guests open: <code>/m/{slug || 'your-slug'}</code>
              </span>
            }
          >
            <div className="slug-input-row">
              <div className="slug-field-group">
                <span className="slug-prefix">/m/</span>
                <Input
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }
                  placeholder="my-restaurant"
                  maxLength={60}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={syncSlugFromName}
                title="Generate from name"
                icon={<Sparkles size={14} />}
                className="btn-sync-slug"
              >
                Sync with name
              </Button>
            </div>
          </Field>

          <Field label="Short description" hint="Shown under your name on the guest menu header.">
            <Textarea
              rows={2}
              value={tagline}
              onChange={(e) => setTagline(e.target.value.slice(0, 500))}
              placeholder="Thoughtfully sourced. Beautifully prepared."
            />
          </Field>

          <div className="form-row">
            <Field label="Currency">
              <CustomSelect
                value={currency}
                onChange={setCurrency}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                ariaLabel="Select Currency"
              />
            </Field>
            <Field label="Live Menu URL (QR Target)" hint="Share this direct URL with guests or on your bio">
              <div className="url-copy-row">
                <Input readOnly value={publicMenuUrl(slug || restaurant.slug)} />
                <div className="url-copy-actions">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    icon={copied ? <Check size={14} /> : <Copy size={14} />}
                    onClick={handleCopyUrl}
                    title="Copy live URL"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <a
                    href={publicMenuUrl(slug || restaurant.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm url-open-btn"
                    title="Open live guest menu"
                  >
                    <ExternalLink size={14} />
                    <span>Open</span>
                  </a>
                </div>
              </div>
            </Field>
          </div>

          <hr className="divider" />

          {/* Section 2: Brand Accent & Theme */}
          <div className="settings-section-head">
            <div className="settings-section-icon">
              <Palette size={18} />
            </div>
            <div className="settings-section-titles">
              <h2>Brand Accent & Visual Theme</h2>
              <p>Visual dining atmosphere and signature highlight color for diner phones</p>
            </div>
          </div>

          <div className="form-row">
            <Field label="Guest Menu Aesthetic Theme" hint="Visual dining ambiance for diner phones">
              <CustomSelect
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'dark', label: 'Luxury Obsidian (Dark Dining - Recommended)' },
                  { value: 'light', label: 'Porcelain White (Classic Light)' }
                ]}
                ariaLabel="Select Theme"
              />
            </Field>
          </div>

          <fieldset className="accent-field">
            <legend>Brand Accent Colour</legend>
            <div className="swatches" role="radiogroup" aria-label="Accent colour">
              {(Object.keys(ACCENTS) as Accent[]).map((key) => (
                <button
                  type="button"
                  key={key}
                  role="radio"
                  aria-checked={accent === key}
                  className={accent === key ? 'on' : ''}
                  onClick={() => setAccent(key)}
                >
                  <i style={{ background: ACCENTS[key].color }} />
                  <span>{ACCENTS[key].label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <hr className="divider" />

          {/* Section 3: Social Media & Free Marketing */}
          <div className="settings-section-head">
            <div className="settings-section-icon">
              <Share2 size={18} />
            </div>
            <div className="settings-section-titles">
              <h2>Social Media & Free Marketing</h2>
              <p>Help diners follow your socials, message your team, or leave 5-star reviews</p>
            </div>
          </div>

          <div className="form-row">
            <Field label="Instagram handle or link" hint="e.g. @thegrandbistro or instagram.com/thegrandbistro">
              <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@thegrandbistro" maxLength={120} />
            </Field>
            <Field label="WhatsApp (Orders & Assistance)" hint="e.g. +923001234567 (direct table message link)">
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+923001234567" maxLength={60} />
            </Field>
          </div>

          <div className="form-row">
            <Field label="Phone number (Call Waiter / Front Desk)" hint="e.g. +92 21 35870000">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 21 35870000" maxLength={60} />
            </Field>
            <Field label="TikTok handle or page" hint="e.g. @thegrandbistro">
              <Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@thegrandbistro" maxLength={120} />
            </Field>
          </div>

          <div className="form-row">
            <Field label="Facebook page" hint="e.g. https://facebook.com/thegrandbistro">
              <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." maxLength={255} />
            </Field>
            <Field label="Official Website link" hint="e.g. https://thegrandbistro.com">
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." maxLength={255} />
            </Field>
          </div>

          <div className="form-row">
            <Field label="Google Maps (Reviews & Location)" hint="Guests can tap to leave 5-star reviews">
              <Input value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." maxLength={500} />
            </Field>
          </div>

          <hr className="divider" />

          {/* Section 4: Guest Wi-Fi */}
          <div className="settings-section-head">
            <div className="settings-section-icon">
              <Wifi size={18} />
            </div>
            <div className="settings-section-titles">
              <h2>Guest Wi-Fi Setup</h2>
              <p>Prompts guests in the menu header for seamless 1-tap connection</p>
            </div>
          </div>

          <div className="form-row">
            <Field label="Guest Wi-Fi Network Name (SSID)" hint="Displayed to guests for instant connection">
              <Input value={wifiName} onChange={(e) => setWifiName(e.target.value)} placeholder="Bistro_Guest_WiFi" maxLength={100} />
            </Field>
            <Field label="Guest Wi-Fi Password" hint="Guests can tap to copy password with 1 click">
              <Input value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} placeholder="welcome2026" maxLength={100} />
            </Field>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="actions end settings-bottom-actions">
            <Button variant="primary" type="submit" loading={saving} disabled={!dirty} icon={<Save size={16} />}>
              Save changes
            </Button>
          </div>
        </form>

        <div className="settings-side">
          <section className="panel settings-preview-panel">
            <div className="settings-section-head">
              <div className="settings-section-icon">
                <Palette size={18} />
              </div>
              <div className="settings-section-titles">
                <h2>Guest Menu Header</h2>
                <p>Live preview of diner hero banner</p>
              </div>
            </div>
            <div className="mini-guest" style={accentStyle(accent)}>
              <div className="mini-cover" style={restaurant.coverUrl ? { backgroundImage: `url(${assetUrl(restaurant.coverUrl)})` } : undefined}>
                <div className="mini-text">
                  <strong>{name || 'Your restaurant'}</strong>
                  <span>{tagline || 'Your short description'}</span>
                </div>
              </div>
              <div className="mini-btn">View on your table</div>
            </div>
            <input ref={cover} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { void changeCover(e.target.files?.[0]); e.target.value = ''; }} />
            <div className="actions wrap spaced cover-actions">
              <Button size="sm" icon={<ImagePlus size={15} />} loading={coverBusy} onClick={() => cover.current?.click()}>
                {restaurant.coverUrl ? 'Replace cover photo' : 'Add cover photo'}
              </Button>
              {restaurant.coverUrl && (
                <Button size="sm" variant="ghost" icon={<Trash2 size={15} />} onClick={removeCover} disabled={coverBusy}>
                  Remove
                </Button>
              )}
            </div>
          </section>

          <section className="panel account settings-account-panel">
            <h2>Account & Security</h2>
            <div className="d-me">
              <div className="d-avatar" aria-hidden>{initials(restaurant.name)}</div>
              <div className="d-me-text">
                <strong>{user?.email}</strong>
                <span className="muted">Restaurant owner</span>
              </div>
            </div>
            <Button icon={<LogOut size={15} />} onClick={signOut} className="btn-signout">
              Sign out
            </Button>
          </section>
        </div>
      </div>

      {/* Floating Unsaved Changes Notification Bar on Mobile */}
      {dirty && (
        <div className="settings-floating-bar" role="status">
          <div className="floating-bar-info">
            <strong>Unsaved changes</strong>
            <span>You have modified restaurant settings</span>
          </div>
          <Button variant="primary" size="sm" onClick={() => save()} loading={saving} icon={<Save size={15} />}>
            Save
          </Button>
        </div>
      )}
    </>
  );
}
