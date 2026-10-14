import { useEffect, useState } from 'react';
import { ArrowRight, Box, Check, ExternalLink, Eye, Plus, QrCode, Sparkles, TrendingUp, UtensilsCrossed } from 'lucide-react';
import { Analytics, api, publicMenuUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { deltaLabel, greeting, longDate } from '../../lib/format';
import { navigate } from '../../lib/router';
import { errorMessage, useToast } from '../../lib/toast';
import { Button, ButtonLink, EmptyState, Spinner } from '../../components/ui';
import { useMenu } from './menuStore';

type Metric = 'scans' | 'views' | 'arLaunches';
const METRICS: { key: Metric; label: string; short: string; icon: typeof QrCode; pick: (a: Analytics) => { current: number; previous: number } }[] = [
  { key: 'scans', label: 'Menu Opens', short: 'Scans', icon: QrCode, pick: (a) => a.scans },
  { key: 'views', label: 'Dish Views', short: 'Views', icon: Eye, pick: (a) => a.itemViews },
  { key: 'arLaunches', label: 'AR Launches', short: '3D Views', icon: Box, pick: (a) => a.arLaunches }
];

export function Overview() {
  const { restaurant } = useAuth();
  const menu = useMenu();
  const toast = useToast();
  const [days, setDays] = useState(7);
  const [metric, setMetric] = useState<Metric>('scans');
  const [stats, setStats] = useState<Analytics | null>(null);
  const [statsError, setStatsError] = useState('');
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatsError('');
    api.analytics(days)
      .then((a) => !cancelled && setStats(a))
      .catch((e: unknown) => !cancelled && setStatsError(errorMessage(e, 'Could not load activity.')));
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (!restaurant) return null;
  if (menu.status === 'loading') return <Spinner label="Loading your dashboard" />;

  const items = menu.items;
  const withModels = items.filter((i) => i.modelUrl).length;
  const steps = [
    { done: Boolean(restaurant.tagline && restaurant.city), icon: Sparkles, title: 'Finish restaurant profile', text: 'Add city and short dining description.', to: '/app/settings', cta: 'Edit profile' },
    { done: items.length > 0, icon: UtensilsCrossed, title: 'Add your dishes', text: 'Names, prices, photos, and categories.', to: '/app/menu', cta: 'Add dishes' },
    { done: withModels > 0, icon: Box, title: 'Attach a 3D model', text: 'Upload a .glb file to rotate dishes on diner tables.', to: '/app/studio', cta: 'Open 3D studio' },
    { done: restaurant.published, icon: QrCode, title: 'Publish and print QR', text: 'Make menu public and put codes on tables.', to: '/app/share', cta: 'Get QR code' }
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  const liveUrl = publicMenuUrl(restaurant.slug);

  async function loadSamples() {
    setSeeding(true);
    try {
      menu.replaceAll(await api.addSampleMenu());
      toast.success('Added six gourmet sample dishes. Edit or customize them anytime.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSeeding(false);
    }
  }

  const active = METRICS.find((m) => m.key === metric)!;

  return (
    <>
      {/* Luxury Welcome & Status Header */}
      <div className="overview-hero-card">
        <div className="overview-hero-content">
          <div className="overview-badge-row">
            <span className={`live-status-dot ${restaurant.published ? 'is-live' : 'is-draft'}`} />
            <span className="live-status-label">{restaurant.published ? 'Live Menu' : 'Draft Menu'}</span>
            <a href={liveUrl} target="_blank" rel="noreferrer" className="overview-slug-link">
              <span>{restaurant.slug}</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <h1>{greeting()}, {restaurant.name}</h1>
          <p className="overview-date">{longDate()}</p>
        </div>

        <div className="overview-hero-actions">
          <ButtonLink to="/app/menu?new=1" variant="primary" icon={<Plus size={16} />}>
            Add a dish
          </ButtonLink>
          <a href={liveUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
            <Eye size={15} />
            <span>Preview live</span>
          </a>
        </div>
      </div>

      {/* Empty State when no dishes */}
      {items.length === 0 ? (
        <section className="panel start-panel">
          <EmptyState
            title="Your menu is currently empty"
            text="Add your first signature dish, or import pre-configured sample dishes with 3D models to try the guest menu immediately."
            action={
              <div className="actions center">
                <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/app/menu?new=1')}>
                  Add your first dish
                </Button>
                <Button loading={seeding} onClick={loadSamples}>
                  Load sample dishes
                </Button>
              </div>
            }
          />
        </section>
      ) : (
        /* Setup Progress Checklist */
        doneCount < steps.length && (
          <section className="panel setup-card" aria-label="Setup checklist">
            <div className="setup-head">
              <div>
                <h2>Restaurant Launch Checklist</h2>
                <p className="muted">{doneCount} of {steps.length} milestones complete ({Math.round((doneCount / steps.length) * 100)}%)</p>
              </div>
              {next && (
                <ButtonLink to={next.to} variant="primary" size="sm" icon={<ArrowRight size={15} />}>
                  {next.cta}
                </ButtonLink>
              )}
            </div>

            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount}>
              <span style={{ width: `${Math.max(6, (doneCount / steps.length) * 100)}%` }} />
            </div>

            <div className="steps-container">
              <ol className="steps">
                {steps.map((s, i) => (
                  <li key={s.title} className={s.done ? 'done' : s === next ? 'next' : ''}>
                    <span className="step-mark">{s.done ? <Check size={14} /> : i + 1}</span>
                    <div className="step-text">
                      <strong>{s.title}</strong>
                      <p>{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )
      )}

      {/* Guest Activity Analytics Panel */}
      <section className="panel activity" aria-label="Guest activity">
        <div className="panel-head">
          <div className="panel-head-titles">
            <h2>Guest Activity & Engagement</h2>
            <p className="muted">Real-time interactions from QR table scans and mobile 3D viewers.</p>
          </div>
          <div className="segmented" role="group" aria-label="Time range">
            {[7, 30].map((d) => (
              <button key={d} className={days === d ? 'on' : ''} aria-pressed={days === d} onClick={() => setDays(d)}>
                {d} days
              </button>
            ))}
          </div>
        </div>

        {statsError ? (
          <p className="muted" role="alert">{statsError}</p>
        ) : !stats ? (
          <Spinner label="Loading activity analytics" />
        ) : (
          <>
            {/* Interactive KPIs Strip */}
            <div className="kpis-grid" role="tablist" aria-label="Select metric">
              {METRICS.map((m) => {
                const d = m.pick(stats);
                const Icon = m.icon;
                const isSelected = metric === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`kpi-card ${isSelected ? 'active' : ''}`}
                    onClick={() => setMetric(m.key)}
                  >
                    <div className="kpi-card-head">
                      <span className="kpi-icon-wrap"><Icon size={16} /></span>
                      <span className="kpi-label">{m.label}</span>
                    </div>
                    <div className="kpi-value">{d.current.toLocaleString()}</div>
                    <div className="kpi-delta-pill">
                      <TrendingUp size={12} />
                      <span>{deltaLabel(d.current, d.previous, days)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="chart-wrapper">
              <Chart series={stats.series} metric={metric} label={active.label} />
            </div>
          </>
        )}
      </section>

      {/* Two Column Grid: Top Dishes and 3D Model Coverage */}
      <div className="two-col">
        {/* Most Viewed Dishes */}
        <section className="panel top-dishes-panel">
          <div className="panel-head">
            <div>
              <h2>Top Performing Dishes</h2>
              <p className="muted">Most viewed on diner phones over the last {days} days.</p>
            </div>
          </div>
          {stats && stats.topItems.length > 0 ? (
            <ol className="top-dishes-list">
              {stats.topItems.map((t, idx) => (
                <li key={t.id} className="top-dish-item">
                  <span className="top-dish-rank">#{idx + 1}</span>
                  <div className="top-dish-info">
                    <strong>{t.name}</strong>
                    <div className="top-dish-stats">
                      <span>{t.views} {t.views === 1 ? 'view' : 'views'}</span>
                      <span className="dot-sep">·</span>
                      <span className="ar-count-tag"><Box size={12} /> {t.arLaunches} in 3D</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted empty-desc">Dish activity will populate here as diners scan table QR codes.</p>
          )}
        </section>

        {/* 3D AR Model Coverage */}
        <section className="panel coverage-panel">
          <div className="panel-head">
            <div>
              <h2>3D Model Coverage</h2>
              <p className="muted">{withModels} of {items.length} dishes have life-size 3D AR.</p>
            </div>
          </div>
          <div className="coverage-bar-wrap">
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={withModels}>
              <span style={{ width: `${items.length ? Math.max(4, (withModels / items.length) * 100) : 0}%` }} />
            </div>
            <span className="coverage-pct">{items.length ? Math.round((withModels / items.length) * 100) : 0}%</span>
          </div>
          <p className="muted coverage-desc">
            3D interactive models allow guests to project dishes onto their table before ordering, increasing upsells by up to 30%.
          </p>
          <ButtonLink to="/app/studio" variant="secondary" icon={<Box size={16} />}>
            Open 3D Studio
          </ButtonLink>
        </section>
      </div>
    </>
  );
}

function Chart({ series, metric, label }: { series: Analytics['series']; metric: Metric; label: string }) {
  const values = series.map((p) => p[metric]);
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  const fmt = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return (
    <figure className="chart">
      <div className="chart-y">
        <span>{max}</span>
        <span>0</span>
      </div>
      <div className="chart-bars" role="img" aria-label={`${label} per day. ${total} in total.`}>
        {series.map((p, i) => (
          <div key={p.date} className="chart-col" title={`${fmt(p.date)}: ${values[i]}`}>
            <span style={{ height: `${values[i] === 0 ? 0 : Math.max(4, (values[i] / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="chart-x">
        <span>{fmt(series[0]?.date ?? new Date().toISOString().slice(0, 10))}</span>
        <span>Today</span>
      </div>
      {total === 0 && <figcaption className="chart-empty">No activity recorded yet. Scan your table QR code to start tracking.</figcaption>}
    </figure>
  );
}
