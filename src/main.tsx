import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n';
import App from './app/App';
import { DevelopmentPreview } from './components/DevelopmentPreview';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DevelopmentPreview />
    <App />
  </StrictMode>,
);
