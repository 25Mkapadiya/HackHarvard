import { expect, it, vi } from 'vitest';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { affiliations, identityFields } from './api';

vi.mock('../../lib/supabaseClient', () => ({ getSupabaseClient: vi.fn() }));

it('requests only safe affiliation columns and public identity fields', async () => {
  const rows = [{ id: 'relationship', vendor_id: 'vendor', market_id: 'market', status: 'approved' }];
  const select = vi.fn().mockResolvedValue({ data: rows, error: null });
  const from = vi.fn().mockReturnValue({ select });
  vi.mocked(getSupabaseClient).mockReturnValue({
    status: 'ready',
    client: { from },
  } as unknown as ReturnType<typeof getSupabaseClient>);

  expect(await affiliations()).toEqual(rows);
  expect(from).toHaveBeenCalledWith('community_affiliations');
  expect(select).toHaveBeenCalledWith(
    `id,vendor_id,market_id,status,vendor:community_identities!vendor_id(${identityFields}),market:community_identities!market_id(${identityFields})`,
  );
  expect(select.mock.calls[0][0]).not.toMatch(/\*|requested_by|reviewed_by|personal_user_id/);
});
