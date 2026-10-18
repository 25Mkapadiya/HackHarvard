import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import InSeasonSearch from './InSeasonSearch';
vi.mock('../../app/data', () => ({
  useCrops: () => ({
    data: {
      regions: { NE: { name: 'Northeast', states: ['MA'] }, SW: { name: 'Southwest', states: ['AZ'] } },
      crops: [
        {
          id: 'apples',
          name: 'Apples',
          nameEs: 'Manzanas',
          category: 'fruits',
          months: { NE: [10], SW: [8] },
        },
      ],
      source: 'Approximate fixture',
      sourceUrl: '#',
      note: 'Test only',
    },
  }),
  useMarkets: () => ({
    data: ['MA', 'AZ'].map((state) => ({
      id: state,
      state,
      name: `${state} Market`,
      city: '',
      geo: { lat: 42, lng: -71 },
      products: ['fruits'],
      productsAreSample: false,
    })),
  }),
}));
vi.mock('../../app/useRegion', () => ({ useRegion: (r: string) => ({ id: r || 'NE' }) }));
vi.mock('../../app/context', () => ({
  useLocationState: () => ({ origin: { lat: 42, lng: -71 } }),
  useNow: () => ({ now: new Date('2026-10-18T12:00Z') }),
}));
vi.mock('../markets/LocationPicker', () => ({ LocationPicker: () => <p>Location picker</p> }));
vi.mock('../markets/MarketCard', () => ({ MarketCard: ({ m }: { m: { name: string } }) => <p>{m.name}</p> }));
it('changes market region without leaking results from the previous region', () => {
  render(
    <MemoryRouter initialEntries={['/search?region=NE&month=10&q=apples']}>
      <InSeasonSearch />
    </MemoryRouter>,
  );
  expect(screen.getByText('MA Market')).toBeInTheDocument();
  expect(screen.queryByText('AZ Market')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Growing region'), { target: { value: 'SW' } });
  expect(screen.getByText('AZ Market')).toBeInTheDocument();
  expect(screen.queryByText('MA Market')).not.toBeInTheDocument();
  expect(screen.getByText(/No matching seasonal entries/)).toBeInTheDocument();
});
