import { getSupabaseClient } from '../../lib/supabaseClient';

export type Identity = {
  id: string;
  kind: 'customer' | 'vendor' | 'market';
  display_name: string;
  description: string;
  location: string;
  details: string;
  image_path: string | null;
  source_market_id: string | null;
  created_at: string;
  follower_count?: number;
  following?: boolean;
  managed?: boolean;
  organizer_approved?: boolean;
};
export type Profile = { id: string; display_name: string; preferred_language: 'en' | 'es' };
export type Affiliation = {
  id: string;
  vendor_id: string;
  market_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  vendor?: Identity;
  market?: Identity;
};
export type Claim = {
  id: string;
  market_id: string | null;
  proposed_name: string | null;
  evidence: string;
  status: string;
  applicant_id: string;
  market?: Identity;
};
export type Post = {
  id: string;
  author_id: string;
  author: Identity;
  body: string;
  category: 'general' | 'announcement' | 'offer' | 'seasonal';
  market_id: string | null;
  market: Identity | null;
  image_path: string | null;
  expires_at: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  liked: boolean;
  saved: boolean;
  following: boolean;
  verified: boolean;
  expired: boolean;
};
export type Comment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  author: Identity;
  body: string;
  created_at: string;
};
export type Workspace = { profile: Profile | null; identities: Identity[]; claims: Claim[]; admin: boolean };
export const identityFields =
  'id,kind,display_name,description,location,details,image_path,source_market_id,lat,lng,created_at,updated_at';

export function client() {
  const state = getSupabaseClient();
  if (state.status !== 'ready') throw state.error;
  return state.client;
}
export function result<T>({ data, error }: { data: unknown; error: unknown }): T {
  if (error) throw error;
  return data as T;
}
export function changed() {
  window.dispatchEvent(new Event('community:changed'));
}
export async function command(action: string, data: Record<string, unknown> = {}) {
  const output = result<{ id: string }>(
    await client().rpc('community_command', { p_action: action, p_data: data }),
  );
  changed();
  return output;
}
export async function workspace(userId: string | null): Promise<Workspace> {
  if (!userId) return { profile: null, identities: [], claims: [], admin: false };
  const api = client();
  const [p, m, c, a] = await Promise.all([
    api.from('community_profiles').select('*').eq('id', userId).single(),
    api
      .from('community_members')
      .select(`identity:community_identities(${identityFields})`)
      .eq('user_id', userId),
    api
      .from('community_organizer_requests')
      .select(`*,market:community_identities(${identityFields})`)
      .eq('applicant_id', userId)
      .order('created_at', { ascending: false }),
    api.rpc('community_is_admin'),
  ]);
  return {
    profile: result<Profile>(p),
    identities: result<{ identity: Identity }[]>(m).map((row) => row.identity),
    claims: result<Claim[]>(c),
    admin: result<boolean>(a),
  };
}
export async function affiliations() {
  return result<Affiliation[]>(
    await client()
      .from('community_affiliations')
      .select(
        `id,vendor_id,market_id,status,vendor:community_identities!vendor_id(${identityFields}),market:community_identities!market_id(${identityFields})`,
      ),
  );
}
export function imageUrl(path: string | null) {
  if (!path) return undefined;
  return client().storage.from('community-images').getPublicUrl(path).data.publicUrl;
}
export async function upload(file: File, userId: string) {
  if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('invalid_image');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const valid =
    file.type === 'image/jpeg'
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : file.type === 'image/png'
        ? bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
        : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
          String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!valid) throw new Error('invalid_image');
  const api = client();
  // RLS permits only the signed-in user's private folder mapping. Never use Auth IDs in public URLs.
  const profile = result<{ image_folder: string }>(
    await api.from('community_profiles').select('image_folder').eq('id', userId).single(),
  );
  if (
    !profile ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(profile.image_folder)
  )
    throw new Error('image_upload_unavailable');
  const path = `${profile.image_folder}/${crypto.randomUUID()}.${file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'}`;
  result(
    await api.storage.from('community-images').upload(path, file, { contentType: file.type, upsert: false }),
  );
  return path;
}
export async function removeImage(path: string | null) {
  if (path) await client().storage.from('community-images').remove([path]);
}
