import { useState } from 'react';
import {
  ArrowRight,
  Box,
  Calculator,
  Check,
  CheckCircle2,
  ChevronRight,
  MessageCircle,
  QrCode,
  ScanLine,
  Send,
  Smartphone,
  Sparkles,
  Upload,
  Wifi,
  Zap
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { ButtonLink, Logo } from '../components/ui';
import { Link } from '../lib/router';
import { ModelViewer } from '../components/ModelViewer';
import { api } from '../lib/api';

const PLANS = [
  {
    name: 'Starter Trial',
    price: '$0 / free',
    period: 'Free for 1 signature dish',
    note: 'Perfect for testing 3D AR in your dining room today',
    items: [
      '1 signature 3D dish model with AR',
      'Instant WebXR table placement',
      'Downloadable printable QR table card',
      'Basic scan & view count analytics',
      'No app install needed for diners'
    ],
    cta: 'Try free dish',
    featured: false
  },
  {
    name: 'Pro Restaurant',
    price: '$39',
    period: 'per month',
    note: 'The complete digital AR dining suite for single restaurants',
    featured: true,
    badge: 'Most Popular',
    items: [
      'Unlimited dishes & categories',
      'Unlimited 3D photorealistic models',
      'Direct Table WhatsApp ordering',
      'Custom branded URL (/m/your-bistro)',
      'Complimentary Guest Wi-Fi 1-click badge',
      'Google Maps 5-star review driver',
      'Daily dish & AR analytics',
      'Luxury vector QR stand export (SVG/PNG)'
    ],
    cta: 'Start 14-day free trial'
  },
  {
    name: 'Hospitality Group',
    price: 'Custom',
    period: 'for multiple branches & franchises',
    note: 'Tailored for restaurant chains and fine dining groups',
    items: [
      'Everything in Pro Restaurant',
      'Multi-branch menu sync & management',
      'Professional on-site 3D food photogrammetry',
      'Custom domain mapping (menu.yourbistro.com)',
      'Dedicated account manager & 24/7 priority support'
    ],
    cta: 'Speak with our team',
    featured: false
  }
];

export function Landing() {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';

  // Interactive ROI Calculator State for Restaurant Owners
  const [dailyTables, setDailyTables] = useState(75);
  const [avgCheck, setAvgCheck] = useState(48);

  // Lead Form State
  const [leadName, setLeadName] = useState('');
  const [leadRest, setLeadRest] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadCity, setLeadCity] = useState('');
  const [leadTables, setLeadTables] = useState<number | undefined>(undefined);
  const [leadNotes, setLeadNotes] = useState('');
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadBusy(true);
    setLeadError(null);
    try {
      await api.submitLead({
        name: leadName.trim(),
        restaurantName: leadRest.trim(),
        phone: leadPhone.trim(),
        email: leadEmail.trim() || undefined,
        notes: [
          leadCity.trim() ? `City: ${leadCity.trim()}` : null,
          leadTables ? `Tables: ${leadTables}` : null,
          leadNotes.trim() ? leadNotes.trim() : null
        ].filter(Boolean).join(' | ') || undefined,
      });
      setLeadSuccess(true);
    } catch (err: any) {
      setLeadError(err?.message || 'Failed to submit inquiry. Please try again or email us directly at team@atelier-ar.com.');
    } finally {
      setLeadBusy(false);
    }
  };

  // Estimating a conservative 18% check increase from 3D visual upselling & dessert attachment
  const monthlyRevenue = dailyTables * avgCheck * 30;
  const estimatedUpsell = Math.round(monthlyRevenue * 0.18);
  const annualBoost = estimatedUpsell * 12;

  return (
    <div className="l-page">
      {/* Top Sticky Navigation */}
      <header className="l-nav">
        <Link to="/" className="l-brand">
          <Logo size={34} />
          <span>Atelier AR</span>
        </Link>
        <nav aria-label="Main Navigation">
          <a href="#demo">Live 3D Demo</a>
          <a href="#roi">ROI Calculator</a>
          <a href="#how">How It Works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#consultation">VIP Demo</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="l-nav-cta">
          {signedIn ? (
            <ButtonLink to="/app" variant="primary" size="sm">
              Open Dashboard
            </ButtonLink>
          ) : (
            <>
              <ButtonLink to="/login" variant="ghost" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink to="/register" variant="primary" size="sm">
                Start Free Trial
              </ButtonLink>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="l-hero" id="demo">
        <div className="l-hero-copy">
          <div className="l-hero-badge">
            <Sparkles size={14} />
            <span>Next-Gen Dining Experience</span>
          </div>
          <h1>
            Turn your menu into a <span className="l-hero-highlight">3D & AR spectacle</span> diners cannot resist.
          </h1>
          <p>
            Atelier AR empowers restaurants to plate photorealistic 3D dishes right onto diners’ tables. Diners scan your luxury QR stand, rotate food on authentic plates, and order directly via WhatsApp. Zero apps to download.
          </p>

          <div className="actions wrap">
            <ButtonLink to={signedIn ? '/app' : '/register'} variant="primary" size="md">
              Start your restaurant menu <ArrowRight size={16} />
            </ButtonLink>
            <a className="btn btn-secondary" href="#roi">
              Calculate your extra revenue
            </a>
          </div>

          <ul className="l-checks">
            <li>
              <Check size={16} /> Instant Safari & Chrome AR (iOS & Android)
            </li>
            <li>
              <Check size={16} /> Direct Table WhatsApp Ordering
            </li>
            <li>
              <Check size={16} /> Update dishes & prices in real time
            </li>
          </ul>
        </div>

        {/* Live 3D Model Stage with Authentic Plate */}
        <div className="l-hero-stage">
          <div className="stage stage-hero">
            <ModelViewer
              className="stage-model"
              src="/models/avocado.glb"
              alt="Live 3D gourmet dish demonstration"
              scale={1.0}
              placement="plate"
              showControls={true}
            />
          </div>
          <p className="stage-caption">
            Drag to rotate 360° · Pinch to zoom · Authentic ceramic plate staging
          </p>
        </div>
      </section>

      {/* Interactive Restaurant ROI Calculator */}
      <section id="roi" className="l-roi-section">
        <div className="l-roi-card">
          <div className="l-roi-left">
            <div className="l-hero-badge">
              <Calculator size={14} />
              <span>Measurable Financial Return</span>
            </div>
            <h2>Calculate your restaurant's extra monthly revenue</h2>
            <p>
              Industry data shows diners spend <strong>18% to 25% more</strong> per table when signature entrees and desserts are showcased in interactive 3D prior to ordering.
            </p>

            <div className="l-roi-inputs">
              <div className="roi-slider-group">
                <div className="roi-label-row">
                  <span>Daily Dining Tables / Covers:</span>
                  <b>{dailyTables} tables / day</b>
                </div>
                <input
                  type="range"
                  min="20"
                  max="350"
                  step="5"
                  value={dailyTables}
                  onChange={(e) => setDailyTables(Number(e.target.value))}
                  className="roi-slider"
                  aria-label="Daily tables slider"
                />
              </div>

              <div className="roi-slider-group">
                <div className="roi-label-row">
                  <span>Average Check per Table ($):</span>
                  <b>${avgCheck} USD</b>
                </div>
                <input
                  type="range"
                  min="15"
                  max="200"
                  step="1"
                  value={avgCheck}
                  onChange={(e) => setAvgCheck(Number(e.target.value))}
                  className="roi-slider"
                  aria-label="Average check slider"
                />
              </div>
            </div>
          </div>

          <div className="l-roi-right">
            <div className="roi-stat-main">
              <span className="roi-stat-label">Estimated Additional Monthly Revenue</span>
              <span className="roi-stat-value">+${estimatedUpsell.toLocaleString()}</span>
              <span className="roi-stat-sub">based on conservative +18% basket uplift</span>
            </div>

            <div className="roi-breakdown">
              <div className="roi-breakdown-item">
                <strong>+${annualBoost.toLocaleString()}</strong>
                <span>Annual added revenue</span>
              </div>
              <div className="roi-breakdown-item">
                <strong>&gt; 25x ROI</strong>
                <span>Return on software cost</span>
              </div>
            </div>

            <ButtonLink to="/register" variant="primary" className="wide">
              Unlock this revenue for your restaurant <ChevronRight size={16} />
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="l-section">
        <h2>From kitchen to table in 3 simple steps</h2>
        <ol className="l-steps">
          <li>
            <span>
              <Upload size={22} />
            </span>
            <h3>1. Upload dishes & 3D models</h3>
            <p>
              Add names, prices, tags, and attach a .glb 3D model. Scan dishes with any smartphone LiDAR app (Scaniverse, Polycam) or upload 3D artist assets.
            </p>
          </li>
          <li>
            <span>
              <QrCode size={22} />
            </span>
            <h3>2. Place luxury QR table stands</h3>
            <p>
              Generate your high-resolution QR table code in one click. Print premium acrylic or wooden table cards directly from your dashboard.
            </p>
          </li>
          <li>
            <span>
              <Smartphone size={22} />
            </span>
            <h3>3. Diners explore & order</h3>
            <p>
              Diners scan the QR code with their default camera, inspect dishes in full 3D and Augmented Reality on their table, and order directly on WhatsApp.
            </p>
          </li>
        </ol>
      </section>

      {/* Feature Bento Grid */}
      <section id="features" className="l-section l-features">
        <h2>Engineered for luxury hospitality and high table turnover</h2>
        <div className="l-bento">
          <article className="wide">
            <Box size={24} />
            <h3>Mobile-First Dark Dining Menu</h3>
            <p>
              Designed specifically for ambient restaurant lighting. High-contrast typography, dietary filter chips (Vegan, Halal, Spicy, Gluten-Free), and instant category jumping.
            </p>
          </article>

          <article>
            <MessageCircle size={24} />
            <h3>Direct Table WhatsApp Ordering</h3>
            <p>
              Diners build their table wishlist and send structured orders with Table Number and special notes directly to your staff's WhatsApp.
            </p>
          </article>

          <article>
            <ScanLine size={24} />
            <h3>Real-Time Live Analytics</h3>
            <p>
              Monitor scan frequency, dish inspection rates, and AR launches by day and by dish to understand exactly what your diners crave.
            </p>
          </article>

          <article className="wide pattern">
            <Wifi size={24} />
            <h3>Free Marketing Hub (Socials & Wi-Fi)</h3>
            <p>
              Turn every diner into a brand advocate. Instant 1-click Guest Wi-Fi password copy, direct Instagram follower links, and Google Maps 5-star review shortcuts right on the menu.
            </p>
          </article>

          <article>
            <Zap size={24} />
            <h3>Zero Printing Re-Costs</h3>
            <p>
              Change prices, mark dishes sold out, or launch seasonal tasting menus in seconds without ever re-printing expensive paper menus again.
            </p>
          </article>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="l-section">
        <h2>Transparent pricing for ambitious restaurants</h2>
        <div className="l-plans">
          {PLANS.map((p) => (
            <article key={p.name} className={p.featured ? 'featured' : ''}>
              {p.badge && <span className="plan-badge">{p.badge}</span>}
              <h3>{p.name}</h3>
              <p className="price">{p.price}</p>
              <p className="muted">{p.period}</p>
              <p className="muted" style={{ fontSize: '13px' }}>
                {p.note}
              </p>
              <ul>
                {p.items.map((i) => (
                  <li key={i}>
                    <Check size={16} />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
              {p.cta === 'Speak with our team' ? (
                <a href="#consultation" className="btn btn-secondary wide">
                  {p.cta}
                </a>
              ) : (
                <ButtonLink to="/register" variant={p.featured ? 'primary' : 'secondary'} className="wide">
                  {p.cta}
                </ButtonLink>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Hospitality Group VIP Consultation & Custom Setup */}
      <section id="consultation" className="l-lead-section">
        <div className="l-lead-card">
          <div className="l-lead-header">
            <div className="l-hero-badge" style={{ width: 'fit-content' }}>
              <Sparkles size={14} />
              <span>VIP Hospitality Program</span>
            </div>
            <h2>Request a Private Consultation & Multi-Branch Demo</h2>
            <p>
              Looking to digitize a multi-location restaurant group, franchise, or fine-dining establishment?
              Our culinary 3D team provides bespoke on-site photogrammetry scanning, menu synchronization, and white-label custom domain setup.
            </p>
          </div>

          {leadSuccess ? (
            <div className="l-lead-success">
              <CheckCircle2 size={36} />
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Inquiry Received!</h3>
              <p style={{ margin: 0, fontSize: '14.5px', color: '#cbd5e1' }}>
                Thank you, <strong>{leadName}</strong>. Our hospitality specialist will review your request for <strong>{leadRest || 'your establishment'}</strong> and contact you within 24 business hours via WhatsApp or email.
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '8px' }}
                onClick={() => {
                  setLeadSuccess(false);
                  setLeadName('');
                  setLeadRest('');
                  setLeadEmail('');
                  setLeadPhone('');
                  setLeadCity('');
                  setLeadTables(undefined);
                  setLeadNotes('');
                }}
              >
                Submit another inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleLeadSubmit} className="l-lead-form">
              {leadError && (
                <div className="l-lead-error" role="alert">
                  {leadError}
                </div>
              )}

              <div className="l-lead-grid">
                <div className="l-lead-field">
                  <label htmlFor="lead-name">Your Full Name *</label>
                  <input
                    id="lead-name"
                    type="text"
                    required
                    placeholder="e.g. Chef Marco Pierre"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                  />
                </div>

                <div className="l-lead-field">
                  <label htmlFor="lead-rest">Restaurant / Group Name *</label>
                  <input
                    id="lead-rest"
                    type="text"
                    required
                    placeholder="e.g. L'Atelier Gourmet Bistro"
                    value={leadRest}
                    onChange={(e) => setLeadRest(e.target.value)}
                  />
                </div>
              </div>

              <div className="l-lead-grid">
                <div className="l-lead-field">
                  <label htmlFor="lead-email">Business Email *</label>
                  <input
                    id="lead-email"
                    type="email"
                    required
                    placeholder="marco@latelier.com"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                  />
                </div>

                <div className="l-lead-field">
                  <label htmlFor="lead-phone">WhatsApp / Phone Number *</label>
                  <input
                    id="lead-phone"
                    type="text"
                    required
                    placeholder="+1 (555) 234-5678"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="l-lead-grid">
                <div className="l-lead-field">
                  <label htmlFor="lead-city">City / Location</label>
                  <input
                    id="lead-city"
                    type="text"
                    placeholder="e.g. Dubai, London, New York"
                    value={leadCity}
                    onChange={(e) => setLeadCity(e.target.value)}
                  />
                </div>

                <div className="l-lead-field">
                  <label htmlFor="lead-tables">Total Dining Tables across branches</label>
                  <input
                    id="lead-tables"
                    type="number"
                    min="1"
                    placeholder="e.g. 120"
                    value={leadTables ?? ''}
                    onChange={(e) => setLeadTables(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>

              <div className="l-lead-field">
                <label htmlFor="lead-notes">Special Requirements / Message</label>
                <textarea
                  id="lead-notes"
                  rows={3}
                  placeholder="Tell us about your menu, number of branches, or custom photogrammetry needs..."
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="submit"
                  disabled={leadBusy}
                  className="btn btn-primary"
                  style={{ minWidth: '220px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {leadBusy ? (
                    'Submitting inquiry...'
                  ) : (
                    <>
                      Request VIP Consultation <Send size={15} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Frequently Asked Questions for Restaurant Owners */}
      <section id="faq" className="l-section">
        <h2>Frequently asked questions from restaurant owners</h2>
        <div className="l-faq">
          <div className="faq-item">
            <h3>Do our dining guests need to download an app?</h3>
            <p>
              No! Guests simply open their smartphone's native camera, scan your table QR code, and the 3D menu launches instantly in Safari or Chrome. WebXR and Apple AR Quick Look work natively.
            </p>
          </div>
          <div className="faq-item">
            <h3>How do we create 3D models of our dishes?</h3>
            <p>
              It is remarkably easy! You can use free iPhone or Android 3D scanning apps like Scaniverse or Polycam by circling your plated dish with your phone for 60 seconds, or upload standard GLB models.
            </p>
          </div>
          <div className="faq-item">
            <h3>How does WhatsApp table ordering work?</h3>
            <p>
              Guests add dishes to their Table Order wishlist, enter their table number, and tap "Send Order via WhatsApp". A clean formatted ticket with dish quantities and totals is sent directly to your phone.
            </p>
          </div>
          <div className="faq-item">
            <h3>Can we customize our restaurant's URL and branding?</h3>
            <p>
              Yes! You can choose your own custom slug like <code>atelier-ar.com/m/your-bistro</code>, select your signature brand accent color, and upload your high-resolution dining cover image.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom Conversion CTA */}
      <section className="l-cta">
        <h2>Ready to give your dishes the presentation they deserve?</h2>
        <p style={{ color: '#cbd5e1', maxWidth: '44ch' }}>
          Join leading modern dining establishments already boosting basket sizes and delighting guests with 3D Augmented Reality menus.
        </p>
        <ButtonLink to="/register" variant="saffron" size="md">
          Start your 14-day free trial today
        </ButtonLink>
      </section>

      {/* Footer */}
      <footer className="l-foot">
        <span>
          <Logo size={22} /> Atelier AR · The 3D Digital Menu Platform
        </span>
        <span>© {new Date().getFullYear()} Atelier AR. All rights reserved.</span>
      </footer>
    </div>
  );
}
