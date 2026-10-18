import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MarketProductReporting } from './MarketProductReporting';
const markets = [{ id: 'a', name: 'Demo directory market', city: 'Boston', state: 'MA' }];
it('supports aliases, multi-product selection, removal, review/edit and local-only duplicate handling', () => {
  const { unmount } = render(<MarketProductReporting markets={markets} />);
  fireEvent.change(screen.getByLabelText('Market for product report'), { target: { value: 'a' } });
  fireEvent.change(screen.getByLabelText('Date observed'), { target: { value: '2026-10-17' } });
  fireEvent.change(screen.getByLabelText('Search observed products'), { target: { value: 'snap bean' } });
  fireEvent.click(screen.getByLabelText('Green beans', { exact: true }));
  fireEvent.change(screen.getByLabelText('Search observed products'), { target: { value: 'apple' } });
  fireEvent.click(screen.getByLabelText('Apples', { exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove Green beans' }));
  fireEvent.change(screen.getByLabelText('Search observed products'), { target: { value: 'carrot' } });
  fireEvent.click(screen.getByLabelText('Carrots', { exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Review report' }));
  expect(screen.getByRole('heading', { name: 'Review product report' })).toBeInTheDocument();
  expect(screen.getByText('Apples · observed · unverified customer')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit report' }));
  expect(within(screen.getByLabelText('Selected products')).getByText('Apples')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remove Carrots' }));
  fireEvent.click(screen.getByRole('button', { name: 'Review report' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add to local demo' }));
  expect(screen.getByRole('status')).toHaveTextContent('Nothing was uploaded or saved permanently');
  expect(screen.getByRole('heading', { name: 'Temporary demo observations (1)' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Review report' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add to local demo' }));
  expect(screen.getByRole('status')).toHaveTextContent('no duplicates added');
  expect(screen.getByRole('button', { name: 'Public submission unavailable' })).toBeDisabled();
  unmount();
  render(<MarketProductReporting markets={markets} />);
  expect(screen.getByRole('heading', { name: 'Temporary demo observations (0)' })).toBeInTheDocument();
});
it('rejects empty selections and future dates; renders notes as text', () => {
  render(<MarketProductReporting markets={markets} />);
  const submit = () =>
    fireEvent.submit(screen.getByRole('button', { name: 'Review report' }).closest('form')!);
  submit();
  expect(screen.getByRole('alert')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Market for product report'), { target: { value: 'a' } });
  fireEvent.click(screen.getByLabelText('Apples', { exact: true }));
  fireEvent.change(screen.getByLabelText('Date observed'), { target: { value: '2999-01-01' } });
  submit();
  expect(screen.queryByText('Review product report')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Date observed'), { target: { value: '2026-10-17' } });
  fireEvent.change(screen.getByLabelText('Report notes (optional)'), {
    target: { value: '<img src=x onerror=alert(1)>' },
  });
  submit();
  expect(screen.getByText(/Notes: <img/)).toBeInTheDocument();
  expect(document.querySelector('img')).toBeNull();
});
