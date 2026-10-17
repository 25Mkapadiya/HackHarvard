import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main className="p-6">
      <h1 className="font-display text-4xl">Market Day Boston</h1>
      <p>Hello — the site is deploying from GitHub Actions.</p>
    </main>
  </StrictMode>,
);
