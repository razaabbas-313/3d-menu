import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque/standard.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/dashboard.css';
import './styles/guest.css';
import './styles/marketing.css';
import App from './App';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './lib/toast';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
);

// Register production Service Worker for offline guest menus & 3D model caching
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
