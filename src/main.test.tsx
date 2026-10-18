import { expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

const startup = vi.hoisted(() => ({ events: [] as string[], tree: null as unknown }));
vi.mock('./i18n', () => ({}));
vi.mock('./app/App', () => ({ default: () => null }));
vi.mock('./components/DevelopmentPreview', () => ({ DevelopmentPreview: () => null }));
vi.mock('./features/auth/callback', () => ({
  captureAuthCallback: () => startup.events.push('capture callback'),
}));
vi.mock('react-dom/client', () => ({
  createRoot: () => {
    startup.events.push('create root');
    return {
      render: (tree: unknown) => {
        startup.events.push('render');
        startup.tree = tree;
      },
    };
  },
}));

it('captures authentication before creating/rendering the app and preserves the development preview', async () => {
  await import('./main');
  const { default: App } = await import('./app/App');
  const { DevelopmentPreview } = await import('./components/DevelopmentPreview');
  expect(startup.events).toEqual(['capture callback', 'create root', 'render']);
  const children = (startup.tree as ReactElement<{ children: ReactElement[] }>).props.children;
  expect(children.map((child) => child.type)).toEqual([DevelopmentPreview, App]);
});
