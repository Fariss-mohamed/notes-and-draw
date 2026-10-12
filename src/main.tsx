import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.tsx';

// Register service worker with automatic background updating
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] New content available; auto-refreshing when ready.');
  },
  onOfflineReady() {
    console.log('[PWA] App is cached and ready for offline use.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
