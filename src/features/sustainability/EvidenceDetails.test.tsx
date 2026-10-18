import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { useState } from 'react';
import { resolveVisitEvidence } from './adapters/visits';
import { EvidenceDetails } from './EvidenceDetails';
import { SustainabilityDashboard } from './SustainabilityDashboard';
import type { Visit } from '../purchases/model';
const visit: Visit = {
  submissionId: 'v',
  marketId: 'm',
  date: '2026-10-17',
  submittedAt: '',
  totalCents: 1234,
  items: [{ id: 'a', product: 'Apples', quantity: 2, unit: 'kg' }],
};
function Harness() {
  const [scenario, setScenario] = useState('');
  const collection = resolveVisitEvidence(
    [visit],
    [{ id: 'm', city: 'Syracuse', state: 'NY' }],
    scenario || undefined,
  );
  return (
    <>
      <EvidenceDetails scenarioId={scenario} onScenarioChange={setScenario} collection={collection} />
      <SustainabilityDashboard
        visits={[visit]}
        evidence={collection.impact}
        comparisonBasis={scenario ? 'modeled-scenario' : 'actual-observed'}
      />
    </>
  );
}
it('requires opt-in and labels real-data scenarios adjacent to their numbers', () => {
  render(<Harness />);
  const food = screen.getByRole('region', { name: 'Food miles difference (mass-weighted sum)' });
  expect(within(food).getByText('Unavailable')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Environmental comparison'), {
    target: { value: 'syracuse-direct-vs-wa' },
  });
  expect(within(food).getByText('5,578 kg·mile')).toBeInTheDocument();
  expect(within(food).getByText('Modeled scenario — not observed purchase impact')).toBeInTheDocument();
  expect(
    within(screen.getByRole('region', { name: 'Transportation CO₂e difference' })).getByText('Unavailable'),
  ).toBeInTheDocument();
  expect(screen.getByText(/Source case evidence is circa 2008/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Environmental comparison'), {
    target: { value: 'syracuse-regional-retail-vs-wa' },
  });
  const transport = screen.getByRole('region', { name: 'Transportation CO₂e difference' });
  expect(within(transport).queryByText('Unavailable')).not.toBeInTheDocument();
  expect(within(transport).getByText('Modeled scenario — not observed purchase impact')).toBeInTheDocument();
  expect(screen.getByText(/This illustration compares two historical supermarket/)).toBeInTheDocument();
  expect(screen.getByText('Recorded market spending').nextElementSibling).toHaveTextContent('$12.34 USD');
  fireEvent.change(screen.getByLabelText('Environmental comparison'), { target: { value: '' } });
  expect(within(food).getByText('Unavailable')).toBeInTheDocument();
});
