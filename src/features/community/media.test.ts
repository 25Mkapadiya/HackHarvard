import { vi } from 'vitest';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { upload } from './api';
import { localDateInput } from './format';
import en from '../../i18n/community.en.json';
import es from '../../i18n/community.es.json';
vi.mock('../../lib/supabaseClient', () => ({ getSupabaseClient: vi.fn() }));
const send = vi.fn();
const read = vi.fn();
const select = vi.fn();
const eq = vi.fn();
const folder = 'aaaaaaaa-1111-4444-8888-bbbbbbbbbbbb';
beforeEach(() => {
  send.mockReset().mockResolvedValue({ data: {}, error: null });
  read.mockReset().mockResolvedValue({ data: { image_folder: folder }, error: null });
  select.mockReset().mockReturnValue({ eq });
  eq.mockReset().mockReturnValue({ single: read });
  vi.mocked(getSupabaseClient).mockReturnValue({
    status: 'ready',
    client: { from: () => ({ select }), storage: { from: () => ({ upload: send }) } } as unknown as Extract<
      ReturnType<typeof getSupabaseClient>,
      { status: 'ready' }
    >['client'],
  });
});
function file(type: string, bytes: number[], size = bytes.length) {
  return {
    type,
    size,
    slice: () => ({ arrayBuffer: async () => new Uint8Array(bytes).buffer }),
  } as unknown as File;
}
it.each([
  ['image/svg+xml', [60, 115, 118, 103], 4],
  ['image/png', [60, 104, 116, 109, 108], 5],
  ['image/png', [137, 80, 78, 71, 13, 10, 26, 10], 5242881],
] as [string, number[], number][])(
  'rejects unsafe or oversized media before upload',
  async (type, bytes, size) => {
    await expect(upload(file(type, bytes, size), 'user')).rejects.toThrow('invalid_image');
    expect(send).not.toHaveBeenCalled();
  },
);
it('uses the private opaque folder and a random filename for a genuine image', async () => {
  const path = await upload(file('image/png', [137, 80, 78, 71, 13, 10, 26, 10]), 'user');
  expect(path).toMatch(new RegExp(`^${folder}/[a-f0-9-]+\\.png$`));
  expect(path).not.toContain('user');
  expect(select).toHaveBeenCalledWith('image_folder');
  expect(eq).toHaveBeenCalledWith('id', 'user');
  expect(send).toHaveBeenCalledWith(path, expect.anything(), { contentType: 'image/png', upsert: false });
});
it.each([
  { data: null, error: { code: '42501' } },
  { data: { image_folder: '../untrusted' }, error: null },
  { data: null, error: null },
])('does not upload when the private folder cannot be obtained safely', async (response) => {
  read.mockResolvedValue(response);
  await expect(
    upload(file('image/png', [137, 80, 78, 71, 13, 10, 26, 10]), 'other-user'),
  ).rejects.toBeDefined();
  expect(send).not.toHaveBeenCalled();
});
it.each(['2026-07-11T15:30:00Z', '2026-01-11T15:30:00Z'])(
  'preserves offer expiry when editing in the local timezone',
  (iso) => {
    expect(new Date(localDateInput(iso)).getTime()).toBe(new Date(iso).getTime());
  },
);
it('handles absent or invalid offer expiry safely', () => {
  expect(localDateInput(null)).toBe('');
  expect(localDateInput('invalid')).toBe('');
});
it('keeps every new account/community translation key available in both languages', () => {
  function keys(value: unknown, prefix = ''): string[] {
    return value && typeof value === 'object'
      ? Object.entries(value).flatMap(([key, child]) => keys(child, `${prefix}.${key}`))
      : [prefix];
  }
  expect(keys(en).sort()).toEqual(keys(es).sort());
});
