import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { RegionalComparison } from './RegionalComparison';
import type { Visit } from '../../purchases/model';
const markets = [{ id: 'test-market', state: 'MA', geo: { lat: 42.36, lng: -71.06 } }];
const visit: Visit = {
  submissionId: 'v',
  marketId: 'test-market',
  date: '2026-10-17',
  submittedAt: '2026-10-18T00:00:00Z',
  totalCents: 1000,
  items: [{ id: 'i', product: 'Apples', quantity: 1, unit: 'kg' }],
};
it('shows separate alternatives and requires an explicit illustrative choice', () => {
  render(<RegionalComparison visits={[visit]} markets={markets} />);
  expect(screen.getByRole('heading', { name: 'Illustrative regional scenario' })).toBeInTheDocument();
  expect(screen.getByText(/They do not measure the actual origin or emissions/)).toBeInTheDocument();
  const control = screen.getByLabelText('Illustration for Apples, entry 1');
  expect(control).toHaveValue('');
  expect(screen.getAllByText('Not available for the whole basket').length).toBeGreaterThan(0);
  fireEvent.change(control, { target: { value: 'apples-MA-NY-vs-WA' } });
  expect(screen.getByText(/Product coverage: 1\/1/)).toHaveTextContent('1 have a selected illustration');
  const card = screen.getByText('Regional vs conventional difference · transportation CO₂e').closest('div')!;
  expect(within(card).getByText(/kg CO2e/)).toBeInTheDocument();
  expect(screen.getByText(/No verified CO₂e avoided is claimed/)).toBeInTheDocument();
});
it('automatically labels a single reviewed case while unsupported items stay unknown', () => {
  const summer = {
    ...visit,
    date: '2026-07-17',
    items: [...visit.items, { id: 'x', product: 'Carrots', quantity: 1, unit: 'kg' as const }],
  };
  render(<RegionalComparison visits={[summer]} markets={markets} />);
  expect(screen.getByText(/One reviewed illustration applies automatically/)).toBeInTheDocument();
  expect(screen.getByText(/No reviewed product\/destination\/season combination/)).toBeInTheDocument();
  expect(screen.getAllByText(/supported subset only/).length).toBeGreaterThan(0);
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});
