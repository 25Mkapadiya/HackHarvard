import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PurchaseEntry } from './PurchaseEntry';
import { PurchaseWorkspace } from './PurchaseWorkspace';
import { MemoryPurchaseRepository, PurchaseRepositoryError, type PurchaseRepository } from './repository';
import { validateNewVisit, validateVisit, type NewVisitInput } from './model';
import { canonicalProductId } from './products';
import { parseQuantity } from './quantity';
import { impactSummary } from '../sustainability/summary';
const markets = [{ id: 'm', name: 'Test Market', city: 'Boston', state: 'MA' }];
const input = (submissionId = 'one'): NewVisitInput => ({
  submissionId,
  marketId: 'm',
  date: '2026-10-17',
  totalCents: 525,
  items: [{ id: 'a', product: 'Apples', quantity: 2, unit: 'lb', spendingCents: 250 }],
});
const clock = () => new Date('2026-10-18T12:00Z');
function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function start() {
  fireEvent.change(screen.getByLabelText('Farmers market'), { target: { value: 'm' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enter purchases' }));
}
function fill(product = 'Apples') {
  fireEvent.change(screen.getByLabelText('Product name'), { target: { value: product } });
  fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Total spent USD'), { target: { value: '5.25' } });
}
describe('manual entry validation', () => {
  it.each(['', '0', '-1', 'NaN', 'Infinity', '10000001'])('rejects invalid required quantity %s', (value) =>
    expect(() => parseQuantity(value)).toThrow(),
  );
  it('accepts fractional measured weights and maps exact aliases only', () => {
    expect(parseQuantity('.25')).toBe(0.25);
    expect(canonicalProductId('apple')).toBe('apples');
    expect(canonicalProductId('pineapple pie')).toBeUndefined();
  });
  it('keeps legacy missing quantities readable but disallows new writes without them', () => {
    const legacy = { ...input(), items: [{ id: 'a', product: 'Apples', unit: 'each' }] };
    expect(validateVisit(legacy, clock()).items[0].quantity).toBeUndefined();
    expect(() => validateNewVisit(legacy, clock())).toThrow();
  });
  it('rejects mismatched food IDs and preserves unknown names without an ID', () => {
    expect(() =>
      validateNewVisit({ ...input(), items: [{ ...input().items[0], productId: 'carrots' }] }, clock()),
    ).toThrow('identifier');
    expect(
      validateNewVisit(
        { ...input(), items: [{ ...input().items[0], product: 'Unknown family recipe' }] },
        clock(),
      ).items[0].productId,
    ).toBeUndefined();
  });
  it('adds, edits and removes products, preserves optional details and reviews exact cents', async () => {
    const repo = new MemoryPurchaseRepository();
    render(<PurchaseEntry markets={markets} repository={repo} onRecorded={() => {}} />);
    start();
    fill('apple');
    expect(screen.queryByText(/upload|recognition|receipt/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Product name')).toHaveAttribute('list');
    expect(screen.getByLabelText('Quantity')).toBeRequired();
    fireEvent.change(screen.getByLabelText('Vendor / farm name (optional)'), { target: { value: 'Farm A' } });
    fireEvent.change(screen.getByLabelText('Product origin (optional)'), {
      target: { value: 'Massachusetts' },
    });
    fireEvent.change(screen.getByLabelText('Item price USD (optional)'), { target: { value: '0.29' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add product' }));
    fireEvent.change(screen.getAllByLabelText('Product name')[1], { target: { value: 'Carrots' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove product 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm information' }));
    expect(await repo.list()).toHaveLength(0);
    expect(screen.getByText('Farm A', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Origin \(self-reported\): Massachusetts/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit information' }));
    expect(screen.getByLabelText('Product name')).toHaveValue('apple');
    fireEvent.change(screen.getByLabelText('Product name'), { target: { value: 'Apples' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm information' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit visit' }));
    await waitFor(async () => expect(await repo.list()).toHaveLength(1));
    expect((await repo.list())[0]).toMatchObject({
      totalCents: 525,
      items: [
        { productId: 'apples', quantity: 2, spendingCents: 29, vendor: 'Farm A', origin: 'Massachusetts' },
      ],
    });
    const summary = impactSummary(await repo.list());
    expect(summary.visits).toBe(1);
    expect(summary.marketSpendingCents).toBe(525);
    expect(summary.localSpending.value).toBeNull();
    expect(summary.foodMiles.weightedDifference.value).toBeNull();
    expect(summary.transport.value).toBeNull();
    expect(summary.lifecycle.value).toBeNull();
  });
  it('requires an item after removing the final row', () => {
    render(
      <PurchaseEntry markets={markets} repository={new MemoryPurchaseRepository()} onRecorded={() => {}} />,
    );
    start();
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Remove product 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm information' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Add at least one purchased product');
  });
  it('prevents double clicks while saving and records one trip', async () => {
    const repo = new MemoryPurchaseRepository(),
      original = repo.submit.bind(repo),
      gate = deferred<void>();
    const submit = vi.spyOn(repo, 'submit').mockImplementation(async (data) => {
      await gate.promise;
      return original(data);
    });
    render(<PurchaseEntry markets={markets} repository={repo} onRecorded={() => {}} />);
    start();
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm information' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit visit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submitting…' }));
    expect(submit).toHaveBeenCalledOnce();
    await act(async () => gate.resolve(undefined));
    await waitFor(async () => expect(await repo.list()).toHaveLength(1));
  });
});
describe('repository integration contract', () => {
  it('returns isolated reads and supports idempotent single deletion', async () => {
    const repo = new MemoryPurchaseRepository(clock);
    await repo.submit(input());
    const visit = (await repo.get('one'))!;
    visit.items[0].product = 'Mutated';
    expect((await repo.get('one'))!.items[0].product).toBe('Apples');
    expect(await repo.get('absent')).toBeNull();
    expect(await repo.delete('one')).toEqual({ status: 'deleted' });
    expect(await repo.delete('one')).toEqual({ status: 'not-found' });
    expect(await repo.list()).toEqual([]);
    await expect(repo.submit(input())).rejects.toThrow('deleted');
    await repo.submit(input('new'));
    expect(await repo.list()).toHaveLength(1);
  });
  it('retains retry aliases after delete and clear, including duplicate payloads with new item IDs', async () => {
    const repo = new MemoryPurchaseRepository(clock);
    await repo.submit(input());
    const duplicate = { ...input('two'), items: [{ ...input().items[0], id: 'different-item' }] };
    expect((await repo.submit(duplicate)).status).toBe('duplicate');
    expect((await repo.submit(duplicate)).status).toBe('duplicate');
    await repo.clear();
    await expect(repo.submit(duplicate)).rejects.toThrow('deleted');
    await expect(repo.submit(input())).rejects.toThrow('deleted');
  });
  it('rejects changed same-key metadata and never overwrites annotations on a duplicate trip', async () => {
    const repo = new MemoryPurchaseRepository(clock);
    await repo.submit(input());
    await expect(
      repo.submit({ ...input(), items: [{ ...input().items[0], origin: 'Unknown' }] }),
    ).rejects.toThrow('key');
    expect(
      (await repo.submit({ ...input('two'), items: [{ ...input().items[0], origin: 'Unknown' }] })).status,
    ).toBe('duplicate');
    expect((await repo.get('one'))!.items[0].origin).toBeUndefined();
  });
});
describe('private workspace boundaries', () => {
  it('resets drafts, history and scenario selection when the injected repository changes', async () => {
    const a = new MemoryPurchaseRepository(clock),
      b = new MemoryPurchaseRepository(clock);
    await a.submit(input());
    const { rerender } = render(<PurchaseWorkspace markets={markets} repository={a} />);
    await screen.findByText('Recorded purchase history');
    fireEvent.change(screen.getByLabelText('Environmental comparison'), {
      target: { value: 'syracuse-direct-vs-wa' },
    });
    start();
    fill('Private draft');
    rerender(<PurchaseWorkspace markets={markets} repository={b} />);
    await screen.findByText('No visits recorded in this repository.');
    expect(screen.queryByDisplayValue('Private draft')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Environmental comparison')).toHaveValue('');
    expect(screen.getByLabelText('Farmers market')).toHaveValue('');
  });
  it('unmounts private form/history for null instead of selecting memory fallback', async () => {
    const repo = new MemoryPurchaseRepository();
    const { rerender } = render(<PurchaseWorkspace markets={markets} repository={repo} />);
    start();
    fill('Private draft');
    rerender(<PurchaseWorkspace markets={markets} repository={null} />);
    expect(screen.getByRole('status')).toHaveTextContent('without an active connection');
    expect(screen.queryByLabelText('Product name')).not.toBeInTheDocument();
    expect(screen.queryByText('Sustainability dashboard')).not.toBeInTheDocument();
  });
  it('ignores old list responses after repository replacement', async () => {
    const a = new MemoryPurchaseRepository(clock),
      b = new MemoryPurchaseRepository(clock),
      response = deferred<Awaited<ReturnType<PurchaseRepository['list']>>>();
    vi.spyOn(a, 'list').mockReturnValue(response.promise);
    const { rerender } = render(<PurchaseWorkspace markets={markets} repository={a} />);
    rerender(<PurchaseWorkspace markets={markets} repository={b} />);
    await screen.findByText('No visits recorded in this repository.');
    await act(async () => response.resolve([{ ...input(), submittedAt: clock().toISOString() }]));
    expect(screen.getByText('No visits recorded in this repository.')).toBeInTheDocument();
  });
  it('retries history loading without deleting the current draft', async () => {
    const repo = new MemoryPurchaseRepository();
    vi.spyOn(repo, 'list').mockRejectedValueOnce(new Error('private upstream details')).mockResolvedValue([]);
    render(<PurchaseWorkspace markets={markets} repository={repo} />);
    start();
    fill('Preserved draft');
    await screen.findByRole('button', { name: 'Retry loading history' });
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading history' }));
    await screen.findByText('No visits recorded in this repository.');
    expect(screen.getByLabelText('Product name')).toHaveValue('Preserved draft');
    expect(screen.queryByText(/private upstream details/)).not.toBeInTheDocument();
  });
  it('locks and unmounts private UI after a session-expired submit', async () => {
    const repo = new MemoryPurchaseRepository();
    vi.spyOn(repo, 'submit').mockRejectedValue(new PurchaseRepositoryError('session-expired'));
    render(<PurchaseWorkspace markets={markets} repository={repo} />);
    start();
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm information' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit visit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Private history, draft and scenario selection were cleared',
    );
    expect(screen.queryByRole('button', { name: 'Submit visit' })).not.toBeInTheDocument();
    expect(screen.queryByText('Sustainability dashboard')).not.toBeInTheDocument();
  });
  it('locks on an expired history request and reconnects only with a fresh repository', async () => {
    const repo = new MemoryPurchaseRepository();
    vi.spyOn(repo, 'list').mockRejectedValue(new PurchaseRepositoryError('session-expired'));
    const { rerender } = render(<PurchaseWorkspace markets={markets} repository={repo} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('session expired');
    rerender(<PurchaseWorkspace markets={markets} repository={new MemoryPurchaseRepository()} />);
    await screen.findByText('No visits recorded in this repository.');
    expect(screen.getByLabelText('Farmers market')).toBeInTheDocument();
  });
});
