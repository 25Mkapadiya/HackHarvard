import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SustainabilityDashboard } from './SustainabilityDashboard';
import { impactSummary } from './summary';
import { itemEvidenceKey } from './evidence';
import type { Visit } from '../purchases/model';
const visit: Visit = {
  submissionId: 'v',
  marketId: 'm',
  date: '2026-10-17',
  submittedAt: '',
  totalCents: 1500,
  items: [{ id: 'a', product: 'Apples', quantity: 2, unit: 'kg', spendingCents: 1500 }],
};
it('shows recorded totals separately from unavailable estimates and purchase details', () => {
  render(
    <SustainabilityDashboard
      visits={[visit]}
      markets={[{ id: 'm', name: 'Test Market', city: '', state: 'MA' }]}
    />,
  );
  expect(screen.getByText('Recorded market spending').nextElementSibling).toHaveTextContent('$15.00 USD');
  expect(
    within(screen.getByRole('region', { name: 'Estimated local spending' })).getByText('Unavailable'),
  ).toBeInTheDocument();
  expect(screen.getAllByText('Unavailable')).toHaveLength(5);
  expect(screen.getByText(/2026-10-17 · Test Market/)).toBeInTheDocument();
  expect(screen.queryByText(/points/i)).not.toBeInTheDocument();
});
it('preserves negative food-mile results and aggregates trips instead of item count', () => {
  const provenance = {
    source: 'Test fixture',
    url: 'https://example.org/test',
    quality: 'measured' as const,
    assumptions: ['Synthetic evidence'],
  };
  const summary = impactSummary([visit], {
    items: {
      [itemEvidenceKey('v', 'a')]: {
        distances: {
          local: { value: 100, unit: 'mile', provenance },
          conventional: { value: 10, unit: 'mile', provenance },
        },
      },
    },
  });
  expect(summary.visits).toBe(1);
  expect(summary.foodMiles.weightedDifference.value).toBe(-180);
  expect(summary.foodMiles.averageDifference.value).toBe(-90);
  expect(summary.transport.value).toBeNull();
});
it('renders an empty repository without claiming environmental savings', () => {
  render(<SustainabilityDashboard visits={[]} />);
  expect(screen.getByText('No visits recorded in this repository.')).toBeInTheDocument();
  expect(screen.getByText('Market visits').nextElementSibling).toHaveTextContent('0');
  expect(
    within(screen.getByRole('region', { name: 'Total life-cycle CO₂e difference' })).getByText('Unavailable'),
  ).toBeInTheDocument();
});
