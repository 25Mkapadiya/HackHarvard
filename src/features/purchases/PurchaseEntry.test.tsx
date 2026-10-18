import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { PurchaseEntry } from './PurchaseEntry';
import { MemoryPurchaseRepository } from './repository';
it('requires review, supports editing, and records multiple items as one visit', async () => {
  const repo = new MemoryPurchaseRepository();
  const onRecorded = vi.fn();
  render(
    <PurchaseEntry
      markets={[{ id: 'm', name: 'Test Market', city: 'Boston', state: 'MA' }]}
      repository={repo}
      onRecorded={onRecorded}
    />,
  );
  fireEvent.change(screen.getByLabelText('Farmers market'), { target: { value: 'm' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enter purchases' }));
  fireEvent.change(screen.getByLabelText('Visit date'), { target: { value: '2026-10-17' } });
  fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Apples' } });
  fireEvent.change(screen.getByLabelText('Quantity (optional)'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add product' }));
  fireEvent.change(screen.getAllByLabelText('Product name')[1], { target: { value: 'Bread' } });
  fireEvent.change(screen.getByLabelText('Total spent USD'), { target: { value: '12.50' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm information' }));
  expect(await repo.list()).toHaveLength(0);
  expect(screen.getByText(/Total spent: \$12.50/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit information' }));
  expect(screen.getAllByLabelText('Product name')[0]).toHaveValue('Apples');
  fireEvent.click(screen.getByRole('button', { name: 'Confirm information' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit visit' }));
  await waitFor(() => expect(onRecorded).toHaveBeenCalledOnce());
  expect((await repo.list())[0].items).toHaveLength(2);
  expect(screen.getByRole('status')).toHaveTextContent('One market visit recorded');
});
it('preserves confirmed information after a storage failure', async () => {
  const repo = new MemoryPurchaseRepository();
  vi.spyOn(repo, 'submit').mockRejectedValue(new Error('offline'));
  render(
    <PurchaseEntry
      markets={[{ id: 'm', name: 'Test Market', city: 'Boston', state: 'MA' }]}
      repository={repo}
      onRecorded={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText('Farmers market'), { target: { value: 'm' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enter purchases' }));
  fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Apples' } });
  fireEvent.change(screen.getByLabelText('Total spent USD'), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm information' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit visit' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Submission failed');
  expect(screen.getByText(/Apples:/)).toBeInTheDocument();
});
