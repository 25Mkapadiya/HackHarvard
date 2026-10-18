// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

let db: PGlite;
const users = {
  alice: '00000000-0000-0000-0000-000000000001',
  bob: '00000000-0000-0000-0000-000000000002',
  admin: '00000000-0000-0000-0000-000000000003',
  eve: '00000000-0000-0000-0000-000000000004',
  outsider: '00000000-0000-0000-0000-000000000005',
};
async function as(user: string | null) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? '']);
  await db.exec(`set role ${user ? 'authenticated' : 'anon'}`);
}
async function command(action: string, data: Record<string, unknown> = {}) {
  const r = await db.query<{ result: { id: string } }>(
    'select public.community_command($1,$2::jsonb) result',
    [action, JSON.stringify(data)],
  );
  return r.rows[0].result.id;
}
async function denied(action: string, data: Record<string, unknown> = {}) {
  await expect(command(action, data)).rejects.toThrow();
}
async function imageFolder(userId: string) {
  return (
    await db.query<{ image_folder: string }>(
      'select image_folder from public.community_profiles where id=$1',
      [userId],
    )
  ).rows[0].image_folder;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public,storage to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner_id text default auth.uid()::text);alter table storage.objects enable row level security;
 grant select,insert,update,delete on storage.objects to authenticated;grant select on storage.objects to anon;
 create function storage.foldername(text) returns text[] language sql as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
 insert into auth.users(id,email_confirmed_at) values ('${users.alice}',now()),('${users.bob}',now()),('${users.admin}',now()),('${users.eve}',null),('${users.outsider}',now());
 -- Exercise inherited PUBLIC defaults as well as Supabase's usual direct role grants.
 alter default privileges in schema public grant all on tables to public,anon,authenticated;
 alter default privileges in schema public grant all on sequences to public,anon,authenticated;
 alter default privileges in schema public grant execute on functions to public,anon,authenticated;
 -- Unrelated objects retain their existing grants; migration revokes must stay scoped.
 create table public.teammate_security_canary(id integer);
 create function public.teammate_security_canary() returns boolean language sql as $$ select true $$;`);
  await db.exec(
    readFileSync(
      fileURLToPath(new URL('../supabase/migrations/202610180001_account_community.sql', import.meta.url)),
      'utf8',
    ),
  );
  await db.exec(
    readFileSync(
      fileURLToPath(new URL('../supabase/migrations/202610180002_discovery_references.sql', import.meta.url)),
      'utf8',
    ),
  );
  await db.exec(
    `insert into public.community_admins values('${users.admin}');insert into public.community_market_catalog values('test-market','Test Market','Boston','MA',42.36,-71.05),('second-market','Second Market','Boston','MA',42.3,-71.0);`,
  );
}, 60000);
afterAll(async () => {
  await db?.close();
});

describe('actual PostgreSQL permissions (local auth/storage fixtures)', () => {
  let vendor: string, market: string, otherMarket: string, aff: string, post: string, personal: string;
  it('removes broad default grants on every new table, sequence and privileged function only', async () => {
    await as(null);
    const tables = await db.query<{ name: string; rls: boolean }>(
      `select relname name,relrowsecurity rls from pg_class c join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='public' and left(relname,10)='community_' and relkind='r'`,
    );
    expect(tables.rows).toHaveLength(15);
    expect(tables.rows.every((t) => t.rls)).toBe(true);
    for (const role of ['anon', 'authenticated']) {
      for (const table of tables.rows) {
        const grants = await db.query<{ writable: boolean }>(
          "select has_table_privilege($1,$2,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') writable",
          [role, `public.${table.name}`],
        );
        expect(grants.rows[0].writable, `${role} writes on ${table.name}`).toBe(false);
      }
      for (const table of ['community_identities', 'community_affiliations']) {
        expect(
          (await db.query("select has_table_privilege($1,$2,'SELECT') allowed", [role, `public.${table}`]))
            .rows,
        ).toEqual([{ allowed: false }]);
      }
      expect(
        (
          await db.query(
            "select has_sequence_privilege($1,'public.community_audit_id_seq','USAGE,SELECT,UPDATE') allowed",
            [role],
          )
        ).rows,
      ).toEqual([{ allowed: false }]);
      const functions = await db.query<{
        name: string;
        executable: boolean;
        definer: boolean;
        config: string[];
      }>(
        `select proname name,has_function_privilege($1,p.oid,'EXECUTE') executable,
         prosecdef definer,proconfig config from pg_proc p join pg_namespace n on n.oid=p.pronamespace
         where n.nspname='public' and left(proname,10)='community_'`,
        [role],
      );
      expect(functions.rows).toHaveLength(7);
      const allowed = ['community_is_admin', 'community_manages', 'community_feed', 'community_identity'];
      if (role === 'authenticated') allowed.push('community_command', 'community_affiliation_private');
      for (const fn of functions.rows) {
        expect(fn.executable, `${role} executes ${fn.name}`).toBe(allowed.includes(fn.name));
        expect(fn.definer).toBe(true);
        expect(fn.config).toContain('search_path=""');
      }
      expect(
        (
          await db.query(
            "select has_table_privilege($1,'public.teammate_security_canary','INSERT,TRUNCATE') allowed,has_function_privilege($1,'public.teammate_security_canary()','EXECUTE') executable",
            [role],
          )
        ).rows,
      ).toEqual([{ allowed: true, executable: true }]);
    }
    await expect(db.exec('select public.community_initialize_user()')).rejects.toMatchObject({
      code: '42501',
    });
    await expect(db.exec("select public.community_command('vendor_create','{}')")).rejects.toMatchObject({
      code: '42501',
    });
    await expect(db.exec("select nextval('public.community_audit_id_seq')")).rejects.toMatchObject({
      code: '42501',
    });
  });
  it('backfills customer identities and protects private profiles and admin membership', async () => {
    await as(users.alice);
    const r = await db.query('select * from public.community_profiles');
    expect(r.rows).toHaveLength(1);
    await expect(db.exec('select * from public.community_admins')).rejects.toThrow();
    await expect(db.exec(`update public.community_profiles set preferred_language='es'`)).rejects.toThrow();
    personal = (await db.query<{ identity_id: string }>('select identity_id from public.community_members'))
      .rows[0].identity_id;
    await command('profile_save', { display_name: 'Alice', preferred_language: 'es' });
    expect(
      (await db.query<{ display_name: string }>('select display_name from public.community_profiles')).rows[0]
        .display_name,
    ).toBe('Alice');
  });
  it('initializes new users with opaque folders and ignores privilege metadata after migration', async () => {
    const id = '00000000-0000-0000-0000-000000000006';
    await db.exec('reset role');
    await db.query('insert into auth.users(id,email_confirmed_at,raw_user_meta_data) values($1,now(),$2)', [
      id,
      { display_name: 'New customer', role: 'admin', image_folder: users.alice },
    ]);
    await as(id);
    const profile = (
      await db.query<{ display_name: string; image_folder: string }>(
        'select display_name,image_folder from public.community_profiles',
      )
    ).rows[0];
    expect(profile.display_name).toBe('New customer');
    expect(profile.image_folder).not.toBe(id);
    expect(profile.image_folder).not.toBe(users.alice);
    expect((await db.query('select public.community_is_admin() admin')).rows).toEqual([{ admin: false }]);
    expect((await db.query('select identity_id from public.community_members')).rows).toHaveLength(1);
  });
  it('requires confirmation and refuses direct privilege writes', async () => {
    await as(users.eve);
    await denied('vendor_create', { display_name: 'Unconfirmed' });
    await as(users.alice);
    await expect(
      db.exec(`insert into public.community_members values(gen_random_uuid(),'${users.alice}')`),
    ).rejects.toThrow();
  });
  it('creates an unverified vendor but never trusts client ownership or role fields', async () => {
    await as(users.alice);
    vendor = await command('vendor_create', {
      display_name: 'Test Vendor',
      user_id: users.bob,
      role: 'admin',
      status: 'approved',
    });
    expect(
      (
        await db.query<{ user_id: string }>(
          'select user_id from public.community_members where identity_id=$1',
          [vendor],
        )
      ).rows[0].user_id,
    ).toBe(users.alice);
    expect(
      (await db.query<{ admin: boolean }>('select public.community_is_admin() admin')).rows[0].admin,
    ).toBe(false);
  });
  it('keeps organizer applicants pending until an administrator approves', async () => {
    await as(users.bob);
    const claim = await command('market_request', {
      source_market_id: 'test-market',
      evidence: 'I organize this test market.',
    });
    market = (
      await db.query<{ market_id: string }>(
        'select market_id from public.community_organizer_requests where id=$1',
        [claim],
      )
    ).rows[0].market_id;
    await denied('identity_save', { id: market, display_name: 'Hijacked' });
    await denied('market_review', { id: claim, status: 'approved' });
    await as(users.admin);
    await command('market_review', { id: claim, status: 'approved' });
    await as(users.bob);
    await command('identity_save', { id: market, display_name: 'Test Market' });
    const second = await command('market_request', {
      source_market_id: 'second-market',
      evidence: 'Please approve this other test market.',
    });
    otherMarket = (
      await db.query<{ market_id: string }>(
        'select market_id from public.community_organizer_requests where id=$1',
        [second],
      )
    ).rows[0].market_id;
    await denied('identity_save', { id: otherMarket, display_name: 'Still pending' });
  });
  it('enforces affiliations per market and prevents vendor self-verification', async () => {
    await as(users.alice);
    aff = await command('affiliation_request', { vendor_id: vendor, market_id: market });
    await denied('affiliation_review', { id: aff, status: 'approved' });
    await as(users.bob);
    await command('affiliation_review', { id: aff, status: 'approved' });
    await denied('affiliation_review', { id: aff, status: 'approved' });
    await as(users.alice);
    await command('affiliation_request', { vendor_id: vendor, market_id: otherMarket });
    const r = await db.query<{ status: string }>(
      'select status from public.community_affiliations where vendor_id=$1 order by status',
      [vendor],
    );
    expect(r.rows.map((x) => x.status)).toEqual(['approved', 'pending']);
  });
  it.each([null, users.outsider])('protects affiliation identifiers from public reader %s', async (user) => {
    await as(user);
    const safe = await db.query(
      'select id,vendor_id,market_id,status from public.community_affiliations order by id',
    );
    expect(safe.rows).toEqual([{ id: aff, vendor_id: vendor, market_id: market, status: 'approved' }]);
    for (const expression of ['requested_by', 'reviewed_by', '*', 'to_jsonb(a)', 'row_to_json(a)']) {
      await expect(
        db.query(`select ${expression} from public.community_affiliations a where id=$1`, [aff]),
      ).rejects.toMatchObject({ code: '42501' });
    }
    // RLS also hides pending relationships, including through public identity joins.
    const joined = await db.query(
      `select a.id,v.display_name vendor,m.display_name market from public.community_affiliations a
       join public.community_identities v on v.id=a.vendor_id
       join public.community_identities m on m.id=a.market_id`,
    );
    expect(joined.rows).toHaveLength(1);
    if (user) {
      expect((await db.query('select public.community_affiliation_private($1) details', [aff])).rows).toEqual(
        [{ details: null }],
      );
    } else {
      await expect(db.query('select public.community_affiliation_private($1)', [aff])).rejects.toMatchObject({
        code: '42501',
      });
    }
  });
  it('preserves private affiliation access only for the relevant managers and administrator', async () => {
    for (const user of [users.alice, users.bob, users.admin]) {
      await as(user);
      const details = await db.query<{ details: Record<string, unknown> }>(
        'select public.community_affiliation_private($1) details',
        [aff],
      );
      expect(details.rows[0].details).toMatchObject({
        id: aff,
        requested_by: users.alice,
        reviewed_by: users.bob,
      });
      await expect(
        db.query('select requested_by from public.community_affiliations where id=$1', [aff]),
      ).rejects.toMatchObject({ code: '42501' });
    }
    await as(users.alice);
    const pending = await db.query<{ id: string }>(
      "select id from public.community_affiliations where status='pending'",
    );
    expect(pending.rows).toHaveLength(1);
    for (const user of [users.alice, users.admin]) {
      await as(user);
      expect(
        (await db.query('select public.community_affiliation_private($1) details', [pending.rows[0].id]))
          .rows[0],
      ).toMatchObject({ details: { requested_by: users.alice, reviewed_by: null } });
    }
    // An organizer's access applies to their own market, not every vendor affiliation.
    await as(users.bob);
    expect(
      (await db.query('select public.community_affiliation_private($1) details', [pending.rows[0].id])).rows,
    ).toEqual([{ details: null }]);
    expect(
      (await db.query('select public.community_affiliation_private($1) details', [users.outsider])).rows,
    ).toEqual([{ details: null }]);
  });
  it('rejects author impersonation, unauthorized market tags and uploaded paths', async () => {
    await as(users.alice);
    await denied('post_save', { author_id: market, body: 'Impersonation', category: 'general' });
    await denied('post_save', {
      author_id: vendor,
      market_id: otherMarket,
      body: 'Unapproved market',
      category: 'offer',
    });
    await denied('post_save', {
      author_id: vendor,
      body: 'Wrong image',
      category: 'general',
      image_path: `${users.bob}/image.png`,
    });
    const folder = await imageFolder(users.alice);
    await command('identity_save', {
      id: vendor,
      display_name: 'Test Vendor',
      image_path: `${folder}/avatar.png`,
    });
    post = await command('post_save', {
      author_id: vendor,
      market_id: market,
      body: 'Seasonal test post',
      category: 'offer',
      expires_at: '2020-01-01T00:00:00Z',
      image_path: `${folder}/offer.png`,
    });
    const cards = await db.query<{ card: { verified: boolean; expired: boolean } }>(
      'select public.community_feed() card',
    );
    expect(cards.rows[0].card.verified).toBe(true);
    expect(cards.rows[0].card.expired).toBe(true);
  });
  it.each([null, users.outsider])('keeps public cards free of private Auth mappings for %s', async (user) => {
    await as(user);
    for (const id of [personal, vendor, market]) {
      const card = await db.query('select public.community_identity($1) card', [id]);
      expect(card.rows[0]).toHaveProperty('card.id', id);
      expect(JSON.stringify(card.rows)).not.toMatch(/personal_user_id|requested_by|reviewed_by/);
      for (const authId of Object.values(users)) expect(JSON.stringify(card.rows)).not.toContain(authId);
    }
    const feed = await db.query('select public.community_feed() card');
    expect(feed.rows).toHaveLength(1);
    expect(JSON.stringify(feed.rows)).not.toMatch(/personal_user_id|requested_by|reviewed_by/);
    for (const authId of Object.values(users)) expect(JSON.stringify(feed.rows)).not.toContain(authId);
    await expect(db.exec('select personal_user_id from public.community_identities')).rejects.toMatchObject({
      code: '42501',
    });
  });
  it('works through likes, comments, replies, follows and private saved posts', async () => {
    await as(users.bob);
    await command('like', { id: post, enabled: true });
    await command('like', { id: post, enabled: true });
    await command('save', { id: post, enabled: true });
    await command('follow', { id: vendor, enabled: true });
    const comment = await command('comment_save', { post_id: post, body: 'Test comment' });
    await command('comment_save', { post_id: post, parent_id: comment, body: 'Test reply' });
    await command('comment_save', { id: comment, body: 'Edited comment' });
    const rows = await db.query<{ card: { like_count: number; comment_count: number } }>(
      "select public.community_feed('following') card",
    );
    expect(rows.rows[0].card.like_count).toBe(1);
    expect(rows.rows[0].card.comment_count).toBe(2);
    await as(users.alice);
    await denied('comment_delete', { id: comment });
    expect((await db.query('select * from public.community_saves')).rows).toHaveLength(0);
  });
  it('keeps reports private, supports moderator action and safe content deletion', async () => {
    await as(users.bob);
    await command('report', { id: post, target_kind: 'post', reason: 'Test moderation report' });
    await as(users.alice);
    expect((await db.query('select * from public.community_reports')).rows).toHaveLength(0);
    await as(users.admin);
    expect((await db.query('select * from public.community_reports')).rows).toHaveLength(1);
  });
  it.each([null, users.outsider])(
    'blocks private data, privilege escalation and cross-owner content writes for %s',
    async (user) => {
      await as(user);
      for (const table of [
        'community_profiles',
        'community_reports',
        'community_audit',
        'community_organizer_requests',
      ]) {
        if (user) {
          const filter = table === 'community_profiles' ? ' where id<>auth.uid()' : '';
          expect((await db.query(`select to_jsonb(t) from public.${table} t${filter}`)).rows).toHaveLength(0);
        } else {
          await expect(db.exec(`select * from public.${table}`)).rejects.toMatchObject({ code: '42501' });
        }
      }
      for (const sql of [
        `insert into public.community_admins values('${users.outsider}')`,
        `insert into public.community_members values('${market}','${users.outsider}')`,
        `update public.community_affiliations set status='approved'`,
        `update public.community_posts set body='hijacked' where id='${post}'`,
        `delete from public.community_posts where id='${post}'`,
        `truncate public.community_posts cascade`,
        `select public.community_initialize_user()`,
      ])
        await expect(db.exec(sql)).rejects.toMatchObject({ code: '42501' });
      for (const [action, data] of [
        ['market_review', { id: aff, status: 'approved' }],
        ['affiliation_review', { id: aff, status: 'approved' }],
        ['member_revoke', { id: market, user_id: users.bob }],
        ['report_resolve', { id: aff }],
        ['post_save', { id: post, author_id: vendor, body: 'hijacked', category: 'general' }],
        ['post_delete', { id: post }],
      ] as [string, Record<string, unknown>][])
        await denied(action, data);
      if (user) {
        const comment = (await db.query<{ id: string }>('select id from public.community_comments limit 1'))
          .rows[0].id;
        await denied('comment_save', { id: comment, body: 'hijacked' });
        await denied('comment_delete', { id: comment });
        expect((await db.query('select id from public.community_profiles')).rows).toEqual([{ id: user }]);
      }
    },
  );
  it('immediately removes revoked verification from market feeds and blocks new tags', async () => {
    await as(users.bob);
    await command('affiliation_review', { id: aff, status: 'revoked' });
    await as(null);
    const cards = await db.query<{ card: { verified: boolean } }>('select public.community_feed() card');
    expect(cards.rows[0].card.verified).toBe(false);
    expect((await db.query('select public.community_feed(p_market=>$1) card', [market])).rows).toHaveLength(
      0,
    );
    await as(users.alice);
    await denied('post_save', {
      author_id: vendor,
      market_id: market,
      body: 'Revoked tag',
      category: 'general',
    });
    await command('post_delete', { id: post });
  });
  it('enforces public and private reads and image ownership policies', async () => {
    await as(null);
    await expect(db.exec('select * from public.community_profiles')).rejects.toThrow();
    await expect(db.exec('select personal_user_id from public.community_identities')).rejects.toThrow();
    await expect(db.exec('select * from public.community_reports')).rejects.toThrow();
    await as(users.bob);
    const otherFolder = await imageFolder(users.bob);
    await as(users.alice);
    const folder = await imageFolder(users.alice);
    await db.query("insert into storage.objects(bucket_id,name) values('community-images',$1)", [
      `${folder}/test.png`,
    ]);
    await expect(
      db.query("insert into storage.objects(bucket_id,name) values('community-images',$1)", [
        `${otherFolder}/bad.png`,
      ]),
    ).rejects.toThrow();
    await denied('post_save', { author_id: personal, body: 'x'.repeat(3001), category: 'general' });
  });
  it('uses opaque image folders while enforcing upload, attachment and deletion ownership', async () => {
    await as(users.outsider);
    const folder = await imageFolder(users.outsider);
    expect(Object.values(users)).not.toContain(folder);
    const owned = (
      await db.query<{ identity_id: string }>('select identity_id from public.community_members')
    ).rows[0].identity_id;
    for (const name of [`${users.outsider}/old.png`, `${folder}/../bad.png`]) {
      await expect(
        db.query("insert into storage.objects(bucket_id,name) values('community-images',$1)", [name]),
      ).rejects.toMatchObject({ code: '42501' });
    }
    await db.query("insert into storage.objects(bucket_id,name) values('community-images',$1)", [
      `${folder}/safe.png`,
    ]);
    await expect(
      db.query('update public.community_profiles set image_folder=$1 where id=auth.uid()', [users.outsider]),
    ).rejects.toMatchObject({ code: '42501' });
    await command('profile_save', {
      display_name: 'Image owner',
      preferred_language: 'en',
      image_folder: users.outsider,
    });
    expect(await imageFolder(users.outsider)).toBe(folder);
    await command('identity_save', {
      id: owned,
      display_name: 'Image owner',
      image_path: `${folder}/safe.png`,
    });
    const id = await command('post_save', {
      author_id: owned,
      body: 'Opaque image test',
      category: 'general',
      image_path: `${folder}/safe.png`,
    });
    await as(users.bob);
    const bobFolder = await imageFolder(users.bob);
    const bobIdentity = (
      await db.query<{ identity_id: string }>(
        "select identity_id from public.community_members m join public.community_identities i on i.id=m.identity_id where i.kind='customer'",
      )
    ).rows[0].identity_id;
    expect(
      (await db.query('select image_folder from public.community_profiles where id=$1', [users.outsider]))
        .rows,
    ).toHaveLength(0);
    for (const [action, data] of [
      ['identity_save', { id: bobIdentity, display_name: 'Bob', image_path: `${folder}/safe.png` }],
      [
        'post_save',
        {
          author_id: bobIdentity,
          body: 'Stolen attachment',
          category: 'general',
          image_path: `${folder}/safe.png`,
        },
      ],
    ] as [string, Record<string, unknown>][])
      await denied(action, data);
    expect(bobFolder).not.toBe(folder);
    expect(
      (await db.query('select owner_id from storage.objects where name=$1', [`${folder}/safe.png`])).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query('update storage.objects set name=$1 where name=$2 returning name', [
          `${bobFolder}/stolen.png`,
          `${folder}/safe.png`,
        ])
      ).rows,
    ).toHaveLength(0);
    expect(
      (await db.query('delete from storage.objects where name=$1 returning name', [`${folder}/safe.png`]))
        .rows,
    ).toHaveLength(0);
    await as(null);
    const publicPost = await db.query('select public.community_feed(p_author=>$1) card', [owned]);
    const publicProfile = await db.query('select public.community_identity($1) card', [owned]);
    expect(publicPost.rows).toHaveLength(1);
    expect(JSON.stringify(publicPost.rows)).toContain(`${folder}/safe.png`);
    for (const response of [publicPost, publicProfile]) {
      for (const authId of Object.values(users)) expect(JSON.stringify(response.rows)).not.toContain(authId);
    }
    expect(
      (await db.query('select name,owner_id from storage.objects where name=$1', [`${folder}/safe.png`]))
        .rows,
    ).toHaveLength(0);
    await expect(
      db.query("insert into storage.objects(bucket_id,name) values('community-images',$1)", [
        `${folder}/guest.png`,
      ]),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      db.query('delete from storage.objects where name=$1', [`${folder}/safe.png`]),
    ).rejects.toMatchObject({ code: '42501' });
    await as(users.outsider);
    expect(
      (await db.query('select owner_id from storage.objects where name=$1', [`${folder}/safe.png`])).rows,
    ).toEqual([{ owner_id: users.outsider }]);
    expect(
      (
        await db.query('update storage.objects set name=$1 where name=$2 returning name', [
          `${folder}/renamed.png`,
          `${folder}/safe.png`,
        ])
      ).rows,
    ).toHaveLength(0);
    expect(
      (await db.query('delete from storage.objects where name=$1 returning name', [`${folder}/safe.png`]))
        .rows,
    ).toHaveLength(1);
    await command('post_delete', { id });
  });
  it('loads the existing canonical discovery references without client catalog writes', async () => {
    await as(null);
    const r = await db.query<{ count: number }>(
      'select count(*)::integer count from public.community_market_catalog',
    );
    expect(r.rows[0].count).toBeGreaterThanOrEqual(14241);
    await as(users.alice);
    await expect(
      db.exec("insert into public.community_market_catalog values('fake','Fake','x','x',0,0)"),
    ).rejects.toThrow();
  });
  it('prevents self-verification even when a vendor owner is an approved organizer', async () => {
    await as(users.alice);
    const claim = await command('market_request', {
      source_market_id: 'test-market',
      evidence: 'Second test organizer request.',
    });
    await as(users.admin);
    await command('market_review', { id: claim, status: 'approved' });
    await as(users.alice);
    await command('affiliation_request', { vendor_id: vendor, market_id: market });
    await denied('affiliation_review', { id: aff, status: 'approved' });
    await as(users.bob);
    await command('affiliation_review', { id: aff, status: 'approved' });
    await as(users.admin);
    await command('member_revoke', { id: market, user_id: users.alice });
    await as(users.alice);
    await denied('identity_save', { id: market, display_name: 'Revoked organizer' });
  });
  it('rejects unknown commands and invalid reply targets and permits own comment deletion', async () => {
    await as(users.alice);
    await denied('grant_admin', { user_id: users.alice });
    const id = await command('post_save', { author_id: personal, body: 'Local test', category: 'general' });
    const c = await command('comment_save', { post_id: id, body: 'Local comment' });
    await denied('comment_save', {
      post_id: id,
      parent_id: '00000000-0000-0000-0000-999999999999',
      body: 'Wrong parent',
    });
    await command('comment_delete', { id: c });
    await command('post_delete', { id });
  });
  it('updates own posts, enforces filters, toggles interactions and allows administrator moderation', async () => {
    await as(users.alice);
    const near = await command('post_save', {
      author_id: vendor,
      market_id: market,
      body: 'Near test market',
      category: 'seasonal',
    });
    await command('post_save', {
      id: near,
      author_id: vendor,
      market_id: market,
      body: 'Edited market post',
      category: 'seasonal',
    });
    const general = await command('post_save', {
      author_id: personal,
      body: 'Newest general post',
      category: 'general',
    });
    await as(users.bob);
    await denied('post_save', {
      id: near,
      author_id: vendor,
      body: 'Unauthorized edit',
      category: 'general',
    });
    const nearby = await db.query<{ card: { id: string } }>(
      "select public.community_feed(p_mode=>'nearby',p_lat=>42.36,p_lng=>-71.05) card",
    );
    expect(nearby.rows.map((r) => r.card.id)).toContain(near);
    expect(
      (await db.query("select public.community_feed(p_mode=>'nearby',p_lat=>0,p_lng=>0) card")).rows,
    ).toHaveLength(0);
    const ranked = await db.query<{ card: { id: string } }>("select public.community_feed('for_you') card");
    expect(ranked.rows[0].card.id).toBe(near);
    const latest = await db.query<{ card: { id: string } }>("select public.community_feed('latest') card");
    expect(latest.rows[0].card.id).toBe(general);
    await command('like', { id: near, enabled: true });
    await command('like', { id: near, enabled: false });
    await command('save', { id: near, enabled: true });
    await command('save', { id: near, enabled: false });
    await command('follow', { id: vendor, enabled: false });
    expect((await db.query("select public.community_feed('following') card")).rows).toHaveLength(0);
    expect((await db.query("select public.community_feed('saved') card")).rows).toHaveLength(0);
    await as(users.admin);
    await command('post_delete', { id: general });
    await as(users.alice);
    await command('post_delete', { id: near });
  });
});
