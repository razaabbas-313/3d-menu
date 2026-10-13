import { FormEvent, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Link, navigate } from '../lib/router';
import { errorMessage } from '../lib/toast';
import { Button, Field, Input, Logo } from '../components/ui';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { signIn, signUp } = useAuth();
  const register = mode === 'register';
  const [restaurantName, setRestaurantName] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (register && !restaurantName.trim()) return setError('Enter your restaurant name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (register && password.length < 8) return setError('Use a password of at least 8 characters.');
    if (!register && !password) return setError('Enter your password.');
    setError('');
    setBusy(true);
    try {
      if (register) await signUp({ email: email.trim(), password, restaurantName: restaurantName.trim(), city: city.trim() });
      else await signIn(email.trim(), password);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="a-page">
      <div className="a-form-side">
        <Link to="/" className="a-brand"><Logo size={34} /><span>Atelier AR</span></Link>
        <form className="a-form" onSubmit={submit} noValidate>
          <h1>{register ? 'Create your menu studio' : 'Welcome back'}</h1>
          <p className="muted">{register ? 'Free to start. Add your dishes and a QR code in minutes.' : 'Sign in to manage your menu.'}</p>
          {register && (
            <div className="form-row">
              <Field label="Restaurant name"><Input value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} autoComplete="organization" autoFocus maxLength={120} /></Field>
              <Field label="City (optional)"><Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} /></Field>
            </div>
          )}
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus={!register} /></Field>
          <Field label="Password" hint={register ? 'At least 8 characters.' : undefined}>
            <span className="pw">
              <Input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={register ? 'new-password' : 'current-password'} />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </span>
          </Field>
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button variant="primary" type="submit" loading={busy} className="wide">{register ? 'Create account' : 'Sign in'}</Button>
          <p className="a-switch">
            {register ? <>Already have an account? <Link to="/login">Sign in</Link></> : <>New to Atelier AR? <Link to="/register">Create an account</Link></>}
          </p>
        </form>
      </div>
      <div className="a-art" aria-hidden>
        <div className="turntable"><div className="plate"><i /></div></div>
        <p>Guests rotate your dishes, then place them on their table.</p>
      </div>
    </div>
  );
}
