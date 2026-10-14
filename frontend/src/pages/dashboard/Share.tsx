import { useState } from 'react';
import { Copy, Download, ExternalLink, Printer } from 'lucide-react';
import { api, publicMenuUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { errorMessage, useToast } from '../../lib/toast';
import { Button, ButtonLink, Chip, Logo, Switch } from '../../components/ui';
import { download, qrPngDataUrl, QrCode, qrSvg } from '../../components/QrCode';
import { PageHeader } from './Shell';
import { useMenu } from './menuStore';

export function Share() {
  const { restaurant, setRestaurant } = useAuth();
  const menu = useMenu();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  if (!restaurant) return null;

  const baseUrl = publicMenuUrl(restaurant.slug);
  const url = tableNumber.trim()
    ? `${baseUrl}?table=${encodeURIComponent(tableNumber.trim())}`
    : baseUrl;
  const fileBase = tableNumber.trim()
    ? `${restaurant.slug}-table-${tableNumber.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-qr`
    : `${restaurant.slug}-menu-qr`;

  async function setPublished(value: boolean) {
    setBusy(true);
    try {
      setRestaurant(await api.publish(value));
      toast.success(value ? 'Published. Your menu is now live.' : 'Unpublished. Guests will see a "not available" page.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(tableNumber.trim() ? `Table ${tableNumber} link copied.` : 'General menu link copied.');
    } catch {
      toast.error('Could not copy automatically. Select the link and copy it manually.');
    }
  }

  return (
    <>
      <PageHeader
        title="QR and sharing"
        subtitle="Generate general or table-specific QR codes with instant WhatsApp order routing."
      />
      <div className="share">
        <section className="panel qr-panel">
          <div className="share-table-selector">
            <div className="share-table-head">
              <label htmlFor="table-num-input">
                <strong>Table-Specific QR Code (Optional)</strong>
              </label>
              <span className="muted" style={{ fontSize: '13px' }}>
                Pre-fills table number for WhatsApp orders & waiter requests
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                id="table-num-input"
                className="input"
                style={{ maxWidth: '160px' }}
                placeholder="e.g. 5 or VIP-1"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
              />
              {tableNumber && (
                <Button size="sm" variant="ghost" onClick={() => setTableNumber('')}>
                  Clear (All Tables)
                </Button>
              )}
            </div>
            <div className="share-table-chips">
              <button
                type="button"
                className={`share-table-chip ${!tableNumber ? 'active' : ''}`}
                onClick={() => setTableNumber('')}
              >
                All Tables
              </button>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`share-table-chip ${tableNumber === num ? 'active' : ''}`}
                  onClick={() => setTableNumber(num)}
                >
                  Table {num}
                </button>
              ))}
            </div>
          </div>

          <div className="qr-box">
            <QrCode value={url} size={260} />
            {tableNumber.trim() && (
              <div style={{ marginTop: '10px', fontWeight: 600, fontSize: '14px', color: 'var(--accent)' }}>
                📍 Routing to Table {tableNumber.trim()}
              </div>
            )}
          </div>
          <div className="link-row">
            <input className="input" readOnly value={url} aria-label="Public menu link" onFocus={(e) => e.currentTarget.select()} />
            <Button icon={<Copy size={15} />} onClick={copy}>Copy</Button>
          </div>
          <div className="actions wrap">
            <Button icon={<Download size={15} />} onClick={async () => download(await qrPngDataUrl(url), `${fileBase}.png`)}>PNG</Button>
            <Button icon={<Download size={15} />} onClick={async () => {
              const blob = new Blob([await qrSvg(url)], { type: 'image/svg+xml' });
              const href = URL.createObjectURL(blob);
              download(href, `${fileBase}.svg`);
              URL.revokeObjectURL(href);
            }}>SVG for print</Button>
            <Button icon={<Printer size={15} />} onClick={() => window.print()}>Print table card</Button>
          </div>
        </section>

        <div className="share-side">
          <section className="panel">
            <div className="panel-head tight">
              <h2>Menu status</h2>
              <Chip tone={restaurant.published ? 'basil' : 'neutral'}>{restaurant.published ? 'Live' : 'Draft'}</Chip>
            </div>
            <Switch
              checked={restaurant.published}
              onChange={(v) => !busy && void setPublished(v)}
              label="Publish menu"
              description={restaurant.published ? 'Anyone with the link or QR code can open it.' : 'Only you can see it, from the preview. Guests cannot open the link yet.'}
            />
            <div className="actions wrap spaced">
              <ButtonLink to="/app/preview" size="sm">Preview as a guest</ButtonLink>
              {restaurant.published && (
                <a className="btn btn-secondary btn-sm" href={url} target="_blank" rel="noreferrer"><ExternalLink size={14} />Open live menu</a>
              )}
            </div>
            {!restaurant.published && menu.items.length === 0 && <p className="field-hint spaced">Add at least one dish before publishing.</p>}
          </section>
          <section className="panel tips">
            <h2>Before you print</h2>
            <ul>
              <li>Publish first, then scan the code with your own phone.</li>
              <li>Print at least 3 cm wide with a white border around the code.</li>
              <li>AR needs a secure (https) link. Use your real domain when you go live.</li>
            </ul>
          </section>
        </div>
      </div>

      {/* Only visible when printing: a ready-made table card. */}
      <div className="print-card" aria-hidden>
        <Logo size={44} />
        <h2>{restaurant.name}</h2>
        {tableNumber.trim() && <div className="print-table-badge">Table {tableNumber.trim()}</div>}
        <p>Scan to see our menu. Many dishes can be viewed in 3D and on your table.</p>
        <QrCode value={url} size={320} />
        <small>{url}</small>
      </div>
    </>
  );
}
