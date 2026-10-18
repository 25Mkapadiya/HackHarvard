import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import InSeasonSearch from './InSeasonSearch';
const location = vi.hoisted(() => ({ origin: { lat: 42, lng: -71 } }));
vi.mock('../../app/data', () => ({
  useCrops: () => ({
    data: {
      regions: { NE: { name: 'Northeast', states: ['MA', 'NY'] }, SW: { name: 'Southwest', states: ['AZ'] } },
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
    data: ['MA', 'AZ', 'NY'].map((state) => ({
      id: state,
      state,
      name: `${state} Market`,
      city: '',
      geo:
        state === 'NY'
          ? { lat: 40, lng: -74 }
          : state === 'AZ'
            ? { lat: 33.45, lng: -112.07 }
            : { lat: 42, lng: -71 },
      products: ['fruits'],
      productsAreSample: false,
    })),
  }),
}));
vi.mock('../../app/useRegion', () => ({ useRegion: (r: string) => ({ id: r || 'NE' }) }));
vi.mock('../../app/context', () => ({
  useLocationState: () => location,
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
  expect(screen.getByText('NY Market')).toBeInTheDocument();
  expect(screen.getByText(/1 markets report fruits/)).toBeInTheDocument();
  expect(screen.queryByText('AZ Market')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Growing region'), { target: { value: 'SW' } });
  expect(screen.getByText('AZ Market')).toBeInTheDocument();
  expect(screen.queryByText('MA Market')).not.toBeInTheDocument();
  expect(screen.getByText(/No matching seasonal entries/)).toBeInTheDocument();
});

it('updates the location hint and recommendations when the selected location changes', () => {
  const view = () => (
    <MemoryRouter initialEntries={['/search?month=6&q=strawberry']}>
      <InSeasonSearch />
    </MemoryRouter>
  );
  const { rerender } = render(view());
  expect(screen.getByRole('heading', { name: 'June · Massachusetts' })).toBeInTheDocument();
  expect(screen.getByText('Source-backed state calendar', { exact: true })).toBeInTheDocument();
  location.origin = { lat: 33.45, lng: -112.07 };
  rerender(view());
  expect(screen.getByRole('heading', { name: 'June · Arizona' })).toBeInTheDocument();
  expect(screen.queryByText('Source-backed state calendar', { exact: true })).not.toBeInTheDocument();
  location.origin = { lat: 21.3, lng: -157.8 };
  rerender(view());
  expect(screen.getByRole('heading', { name: /June · Unknown location/ })).toBeInTheDocument();
  expect(screen.getByText('Seasonal information unknown', { exact: true })).toBeInTheDocument();
  location.origin = { lat: 42, lng: -71 };
});
