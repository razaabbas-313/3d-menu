import { useEffect, useState } from 'react';
import { ArrowRight, Box, Check, Plus, QrCode, Sparkles, UtensilsCrossed } from 'lucide-react';
import { Analytics, api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { deltaLabel, greeting, longDate } from '../../lib/format';
import { navigate } from '../../lib/router';
import { errorMessage, useToast } from '../../lib/toast';
import { Button, ButtonLink, EmptyState, Spinner } from '../../components/ui';
import { PageHeader } from './Shell';
import { useMenu } from './menuStore';

type Metric = 'scans' | 'views' | 'arLaunches';
const METRICS: { key: Metric; label: string; pick: (a: Analytics) => { current: number; previous: number } }[] = [
  { key: 'scans', label: 'Menu opens', pick: (a) => a.scans },
  { key: 'views', label: 'Dish views', pick: (a) => a.itemViews },
  { key: 'arLaunches', label: 'AR launches', pick: (a) => a.arLaunches }
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
  if (menu.status === 'loading') return <Spinner label="Loading your menu" />;

  const items = menu.items;
  const withModels = items.filter((i) => i.modelUrl).length;
  const steps = [
    { done: Boolean(restaurant.tagline && restaurant.city), icon: Sparkles, title: 'Finish your restaurant profile', text: 'Add a city and a short description guests will see.', to: '/app/settings', cta: 'Open settings' },
    { done: items.length > 0, icon: UtensilsCrossed, title: 'Add your dishes', text: 'Names, prices and a photo for each dish.', to: '/app/menu', cta: 'Add dishes' },
    { done: withModels > 0, icon: Box, title: 'Attach a 3D model', text: 'Upload a .glb file to a dish so guests can rotate it and place it on their table.', to: '/app/studio', cta: 'Open 3D studio' },
    { done: restaurant.published, icon: QrCode, title: 'Publish and print your QR code', text: 'Make the menu public and put the code on your tables.', to: '/app/share', cta: 'Get your QR code' }
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);

  async function loadSamples() {
    setSeeding(true);
    try {
      menu.replaceAll(await api.addSampleMenu());
      toast.success('Added six sample dishes. Edit or delete them any time.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSeeding(false);
    }
  }

  const active = METRICS.find((m) => m.key === metric)!;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${restaurant.name}`}
        subtitle={longDate()}
        actions={<ButtonLink to="/app/menu?new=1" variant="primary" icon={<Plus size={16} />}>Add a dish</ButtonLink>}
      />

      {items.length === 0 ? (
        <section className="panel start-panel">
          <EmptyState
            title="Your menu is empty"
            text="Add your first dish, or start from six sample dishes so you can try the 3D studio, QR code and guest menu straight away."
            action={
              <div className="actions center">
                <Button variant="primary" icon={<Plus size={16} />} onClick={() => navigate('/app/menu?new=1')}>Add your first dish</Button>
                <Button loading={seeding} onClick={loadSamples}>Use sample dishes</Button>
              </div>
            }
          />
        </section>
      ) : (
        doneCount < steps.length && (
          <section className="panel setup" aria-label="Setup checklist">
            <div className="setup-head">
              <div>
                <h2>Get ready for your first guests</h2>
                <p className="muted">{doneCount} of {steps.length} steps done</p>
              </div>
              {next && <ButtonLink to={next.to} variant="primary" icon={<ArrowRight size={16} />}>{next.cta}</ButtonLink>}
            </div>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount}>
              <span style={{ width: `${Math.max(4, (doneCount / steps.length) * 100)}%` }} />
            </div>
            <ol className="steps">
              {steps.map((s, i) => (
                <li key={s.title} className={s.done ? 'done' : s === next ? 'next' : ''}>
                  <span className="step-mark">{s.done ? <Check size={14} /> : i + 1}</span>
                  <div>
                    <strong>{s.title}</strong>
                    <p>{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )
      )}

      <section className="panel activity" aria-label="Guest activity">
        <div className="panel-head">
          <div>
            <h2>Guest activity</h2>
            <p className="muted">What guests do after scanning your QR code.</p>
          </div>
          <div className="segmented" role="group" aria-label="Time range">
            {[7, 30].map((d) => (
              <button key={d} className={days === d ? 'on' : ''} aria-pressed={days === d} onClick={() => setDays(d)}>{d} days</button>
            ))}
          </div>
        </div>

        {statsError ? (
          <p className="muted" role="alert">{statsError}</p>
        ) : !stats ? (
          <Spinner label="Loading activity" />
        ) : (
          <>
            <div className="kpis" role="tablist" aria-label="Metric">
              {METRICS.map((m) => {
                const d = m.pick(stats);
                return (
                  <button key={m.key} role="tab" aria-selected={metric === m.key} className={`kpi ${metric === m.key ? 'on' : ''}`} onClick={() => setMetric(m.key)}>
                    <span className="kpi-label">{m.label}</span>
                    <span className="kpi-value">{d.current.toLocaleString()}</span>
                    <span className="kpi-delta">{deltaLabel(d.current, d.previous, days)}</span>
                  </button>
                );
              })}
            </div>
            <Chart series={stats.series} metric={metric} label={active.label} />
          </>
        )}
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Most viewed dishes</h2>
              <p className="muted">Last {days} days</p>
            </div>
          </div>
          {stats && stats.topItems.length > 0 ? (
            <ol className="top-list">
              {stats.topItems.map((t) => (
                <li key={t.id}>
                  <strong>{t.name}</strong>
                  <span>{t.views} {t.views === 1 ? 'view' : 'views'}</span>
                  <span>{t.arLaunches} AR</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">Dish views appear here once guests start opening dishes on your public menu.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>3D coverage</h2>
              <p className="muted">{withModels} of {items.length} dishes have a 3D model.</p>
            </div>
          </div>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={withModels}>
            <span style={{ width: `${items.length ? Math.max(3, (withModels / items.length) * 100) : 0}%` }} />
          </div>
          <p className="muted spaced">
            Start with the dishes guests ask about most: signature plates, desserts and anything with a dramatic presentation.
          </p>
          <ButtonLink to="/app/studio" icon={<Box size={16} />}>Open 3D studio</ButtonLink>
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
      {total === 0 && <figcaption className="chart-empty">No activity in this period yet. Publish your menu and share the QR code to start collecting data.</figcaption>}
    </figure>
  );
}
