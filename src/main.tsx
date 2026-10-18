import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n';
import App from './app/App';
import { captureAuthCallback } from './features/auth/callback';

captureAuthCallback(window.location, window.history);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
