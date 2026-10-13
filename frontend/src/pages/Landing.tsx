import { Box, Check, QrCode, ScanLine, Smartphone, Upload } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { ButtonLink, Logo } from '../components/ui';
import { Link } from '../lib/router';
import { ModelViewer } from '../components/ModelViewer';

// Placeholder pricing: replace with your real plans before launch.
const PLANS = [
  { name: 'Starter', price: 'Free', note: 'For trying it with one dish', items: ['Up to 8 dishes', '1 model with AR', 'QR code and table card', 'Guest activity counts'] },
  { name: 'Restaurant', price: 'Rs 4,900 / month', note: 'For one restaurant', featured: true, items: ['Unlimited dishes', 'Unlimited 3D models', 'Your accent colour and cover photo', 'Activity by dish and by day'] },
  { name: 'Group', price: 'Talk to us', note: 'For several branches', items: ['Everything in Restaurant', 'Several locations', 'Help scanning your signature dishes'] }
];

export function Landing() {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';
  return (
    <div className="l-page">
      <header className="l-nav">
        <Link to="/" className="l-brand"><Logo size={34} /><span>Atelier AR</span></Link>
        <nav aria-label="Sections">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="l-nav-cta">
          {signedIn ? <ButtonLink to="/app" variant="primary" size="sm">Open dashboard</ButtonLink> : (
            <>
              <ButtonLink to="/login" variant="ghost" size="sm">Sign in</ButtonLink>
              <ButtonLink to="/register" variant="primary" size="sm">Start free</ButtonLink>
            </>
          )}
        </div>
      </header>

      <section className="l-hero">
        <div className="l-hero-copy">
          <h1>Let guests see the dish before they order it.</h1>
          <p>Atelier AR turns your menu into 3D. Guests scan a QR code, spin each dish on their phone, and place it on the table in augmented reality. No app to install.</p>
          <div className="actions wrap">
            <ButtonLink to={signedIn ? '/app' : '/register'} variant="primary">Build your menu</ButtonLink>
            <a className="btn btn-secondary" href="#how">See how it works</a>
          </div>
          <ul className="l-checks">
            <li><Check size={16} />Works in the phone browser</li>
            <li><Check size={16} />iPhone and Android AR</li>
            <li><Check size={16} />Update dishes any time</li>
          </ul>
        </div>
        <div className="l-hero-stage">
          <div className="stage stage-hero">
            <div className="stage-floor" aria-hidden />
            <ModelViewer className="stage-model" src="/models/avocado.glb" alt="A cut avocado in 3D. Drag to rotate." />
          </div>
          <p className="stage-caption">This is a live 3D model. Drag to rotate it.</p>
        </div>
      </section>

      <section id="how" className="l-section">
        <h2>From a model file to the table in three steps</h2>
        <ol className="l-steps">
          <li><span><Upload size={20} /></span><h3>1. Upload</h3><p>Add your dishes, then attach a .glb 3D model to the ones you want to show off. Scan a dish with a phone app or work with a 3D artist.</p></li>
          <li><span><QrCode size={20} /></span><h3>2. Print your QR code</h3><p>Publish the menu and print the ready-made table card. The code never changes, so every update goes live instantly.</p></li>
          <li><span><Smartphone size={20} /></span><h3>3. Guests explore</h3><p>They scan, rotate each dish, and tap “View on your table” to see it at real size on their own table.</p></li>
        </ol>
      </section>

      <section id="features" className="l-section l-features">
        <h2>Everything a menu needs, nothing it does not</h2>
        <div className="l-bento">
          <article className="wide"><Box size={22} /><h3>A menu guests actually enjoy</h3><p>A fast, mobile-first menu with categories, search, dietary labels and sold-out states. Dishes with a model get a 3D badge and a larger view.</p></article>
          <article><ScanLine size={22} /><h3>See what works</h3><p>Real counts of menu opens, dish views and AR launches, by day and by dish.</p></article>
          <article><Smartphone size={22} /><h3>Looks like you</h3><p>Your name, cover photo and accent colour on every screen.</p></article>
          <article className="wide pattern"><QrCode size={22} /><h3>Table cards in one click</h3><p>Download the QR as PNG or SVG, or print a ready-made table card straight from the dashboard.</p></article>
        </div>
      </section>

      <section id="pricing" className="l-section">
        <h2>Simple pricing</h2>
        <div className="l-plans">
          {PLANS.map((p) => (
            <article key={p.name} className={p.featured ? 'featured' : ''}>
              <h3>{p.name}</h3>
              <p className="price">{p.price}</p>
              <p className="muted">{p.note}</p>
              <ul>{p.items.map((i) => <li key={i}><Check size={15} />{i}</li>)}</ul>
              <ButtonLink to="/register" variant={p.featured ? 'primary' : 'secondary'}>{p.price === 'Talk to us' ? 'Get in touch' : 'Start free'}</ButtonLink>
            </article>
          ))}
        </div>
      </section>

      <section className="l-cta">
        <h2>Give your best dish its close-up.</h2>
        <ButtonLink to="/register" variant="saffron">Create your menu studio</ButtonLink>
      </section>

      <footer className="l-foot">
        <span><Logo size={22} /> Atelier AR</span>
        <span>© {new Date().getFullYear()} Atelier AR</span>
      </footer>
    </div>
  );
}
