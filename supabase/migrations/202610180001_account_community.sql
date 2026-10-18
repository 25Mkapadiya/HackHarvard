-- Additive community subsystem. No legacy discovery/demo tables are modified.
begin;
create table public.community_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  preferred_language text not null default 'en' check (preferred_language in ('en','es')),
  -- Private, immutable ownership mapping. Public media paths never need an Auth UUID.
  image_folder uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.community_market_catalog (
  source_id text primary key, name text not null, city text not null, state text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180)
);
create table public.community_identities (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('customer','vendor','market')),
  display_name text not null check (length(btrim(display_name)) between 1 and 80),
  description text not null default '' check (length(description) <= 2000),
  location text not null default '' check (length(location) <= 200),
  details text not null default '' check (length(details) <= 2000),
  image_path text,
  personal_user_id uuid unique references auth.users(id) on delete cascade,
  source_market_id text unique references public.community_market_catalog(source_id),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'customer') = (personal_user_id is not null)),
  check (source_market_id is null or kind = 'market')
);
-- Privilege and administrative data are intentionally separate from public identities.
create table public.community_admins (user_id uuid primary key references auth.users(id) on delete cascade);
create table public.community_members (
  identity_id uuid references public.community_identities(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (identity_id,user_id)
);
create table public.community_organizer_requests (
  id uuid primary key default gen_random_uuid(), applicant_id uuid not null references auth.users(id) on delete cascade,
  market_id uuid references public.community_identities(id) on delete cascade,
  proposed_name text check (length(btrim(proposed_name)) between 1 and 80),
  evidence text not null check (length(btrim(evidence)) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (market_id is not null or proposed_name is not null)
);
create unique index community_pending_claim on public.community_organizer_requests(applicant_id,market_id) where status='pending' and market_id is not null;
create table public.community_affiliations (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.community_identities(id) on delete cascade,
  market_id uuid not null references public.community_identities(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','approved','rejected','revoked')),
  requested_by uuid not null references auth.users(id), reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz, created_at timestamptz not null default now(),
  unique(vendor_id,market_id), check(vendor_id <> market_id)
);
create table public.community_posts (
  id uuid primary key default gen_random_uuid(), author_id uuid not null references public.community_identities(id) on delete cascade,
  body text not null check(length(btrim(body)) between 1 and 3000),
  category text not null default 'general' check(category in ('general','announcement','offer','seasonal')),
  market_id uuid references public.community_identities(id) on delete set null,
  image_path text, expires_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index community_posts_latest on public.community_posts(created_at desc,id);
create index community_posts_author on public.community_posts(author_id,created_at desc);
create index community_posts_market on public.community_posts(market_id,created_at desc);
create table public.community_comments (
  id uuid primary key default gen_random_uuid(), post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references public.community_identities(id) on delete cascade,
  parent_id uuid references public.community_comments(id) on delete cascade,
  body text not null check(length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index community_comments_post on public.community_comments(post_id,created_at);
create table public.community_likes (
  user_id uuid references auth.users(id) on delete cascade, post_id uuid references public.community_posts(id) on delete cascade,
  primary key(user_id,post_id)
);
create table public.community_follows (
  user_id uuid references auth.users(id) on delete cascade, identity_id uuid references public.community_identities(id) on delete cascade,
  primary key(user_id,identity_id)
);
create table public.community_saves (
  user_id uuid references auth.users(id) on delete cascade, post_id uuid references public.community_posts(id) on delete cascade,
  primary key(user_id,post_id)
);
create table public.community_reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references auth.users(id),
  target_id uuid not null, target_kind text not null check(target_kind in ('post','comment')),
  reason text not null check(length(btrim(reason)) between 5 and 1000),
  resolved boolean not null default false, created_at timestamptz not null default now(),
  unique(reporter_id,target_id,target_kind)
);
create table public.community_audit (
  id bigint generated always as identity primary key, actor_id uuid not null references auth.users(id),
  action text not null, target_id uuid not null, created_at timestamptz not null default now()
);
create index community_likes_post on public.community_likes(post_id);
create index community_follows_identity on public.community_follows(identity_id);
create index community_audit_actor_time on public.community_audit(actor_id,created_at);
create index community_affiliations_market on public.community_affiliations(market_id,status);
create index community_claims_applicant on public.community_organizer_requests(applicant_id,status);
-- Public invalidation signal contains no private identities, claims or moderation details.
create table public.community_public_updates(id integer primary key check(id=1),version bigint not null default 0);
insert into public.community_public_updates values(1,0);
alter table public.community_public_updates enable row level security;
revoke all on public.community_public_updates from public,anon,authenticated;
grant select on public.community_public_updates to anon,authenticated;
create policy community_updates_read on public.community_public_updates for select using(true);
revoke all on sequence public.community_audit_id_seq from public,anon,authenticated;

create function public.community_is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_admins where user_id=auth.uid());
$$;
create function public.community_manages(p_identity uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_members where identity_id=p_identity and user_id=auth.uid());
$$;

create function public.community_initialize_user() returns trigger language plpgsql security definer set search_path='' as $$
declare v_identity uuid; v_name text;
begin
 v_name := coalesce(nullif(left(btrim(new.raw_user_meta_data->>'display_name'),80),''),'Market Day member');
 insert into public.community_profiles(id,display_name,preferred_language) values(new.id,v_name,case when new.raw_user_meta_data->>'preferred_language'='es' then 'es' else 'en' end);
 insert into public.community_identities(kind,display_name,personal_user_id) values('customer',v_name,new.id) returning id into v_identity;
 insert into public.community_members values(v_identity,new.id);
 return new;
end; $$;
create trigger community_new_user after insert on auth.users for each row execute function public.community_initialize_user();
-- Backfill existing users once, without exposing their emails or copying privilege metadata.
insert into public.community_profiles(id,display_name,preferred_language)
 select id,coalesce(nullif(left(btrim(raw_user_meta_data->>'display_name'),80),''),'Market Day member'),case when raw_user_meta_data->>'preferred_language'='es' then 'es' else 'en' end from auth.users;
insert into public.community_identities(kind,display_name,personal_user_id)
 select 'customer',display_name,id from public.community_profiles;
insert into public.community_members select id,personal_user_id from public.community_identities where kind='customer';

-- Read policies. ALL writes go through the checked command function below.
-- Remove direct role defaults and PUBLIC inheritance on these new objects only.
-- Schema-wide defaults and unrelated objects are deliberately left untouched.
do $$ declare n text; begin
 foreach n in array array['profiles','market_catalog','identities','admins','members','organizer_requests','affiliations','posts','comments','likes','follows','saves','reports','audit'] loop
  execute format('alter table public.%I enable row level security','community_'||n);
  execute format('revoke all on public.%I from public, anon, authenticated','community_'||n);
 end loop;
end $$;
grant select on public.community_market_catalog,public.community_posts,public.community_comments to anon,authenticated;
grant select(id,kind,display_name,description,location,details,image_path,source_market_id,lat,lng,created_at,updated_at) on public.community_identities to anon,authenticated;
grant select on public.community_profiles,public.community_members,public.community_organizer_requests,
 public.community_likes,public.community_follows,public.community_saves,public.community_reports,public.community_audit to authenticated;
-- RLS controls visible relationships; column grants keep Auth UUIDs private even on approved rows.
grant select(id,vendor_id,market_id,status) on public.community_affiliations to anon,authenticated;
create policy community_catalog_read on public.community_market_catalog for select using(true);
create policy community_identity_read on public.community_identities for select using(true);
create policy community_post_read on public.community_posts for select using(true);
create policy community_comment_read on public.community_comments for select using(true);
create policy community_profile_private on public.community_profiles for select using(id=auth.uid());
create policy community_members_private on public.community_members for select using(user_id=auth.uid() or public.community_is_admin());
create policy community_claim_private on public.community_organizer_requests for select using(applicant_id=auth.uid() or public.community_is_admin());
create policy community_affiliation_read on public.community_affiliations for select using(status='approved' or public.community_manages(vendor_id) or public.community_manages(market_id) or public.community_is_admin());
create policy community_likes_private on public.community_likes for select using(user_id=auth.uid());
create policy community_follows_private on public.community_follows for select using(user_id=auth.uid());
create policy community_saves_private on public.community_saves for select using(user_id=auth.uid());
create policy community_reports_private on public.community_reports for select using(reporter_id=auth.uid() or public.community_is_admin());
create policy community_audit_admin on public.community_audit for select using(public.community_is_admin());

-- A single, explicit command boundary prevents mass assignment of owners, roles or statuses.
create function public.community_command(p_action text,p_data jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid := auth.uid(); v_folder uuid; v_id uuid; v_author uuid; v_market uuid; v_vendor uuid; v_parent uuid;
 v_post public.community_posts; v_comment public.community_comments; v_claim public.community_organizer_requests;
 v_aff public.community_affiliations; v_identity public.community_identities; v_catalog public.community_market_catalog;
 v_status text; v_name text; v_image text; v_category text;
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) then
  raise exception 'confirmed_session_required' using errcode='42501';
 end if;
 select image_folder into strict v_folder from public.community_profiles where id=u;
 -- Serialize mutations per actor: bounded content creation and duplicate-resistant toggles.
 perform pg_advisory_xact_lock(hashtext(u::text));
 if p_action in ('post_save','comment_save','vendor_create','market_request','market_reference','affiliation_request','identity_save','profile_save','report') and
  (select count(*) from public.community_audit where actor_id=u and created_at > now()-interval '1 minute') >= 30 then
  raise exception 'rate_limited' using errcode='P0001';
 end if;
 v_id := nullif(p_data->>'id','')::uuid;
 if p_action='profile_save' then
  v_name:=btrim(p_data->>'display_name');
  update public.community_profiles set display_name=v_name,preferred_language=p_data->>'preferred_language',updated_at=now() where id=u;
  update public.community_identities set display_name=v_name,updated_at=now() where personal_user_id=u;
 elsif p_action='vendor_create' then
  insert into public.community_identities(kind,display_name,description,location,details)
   values('vendor',btrim(p_data->>'display_name'),coalesce(p_data->>'description',''),coalesce(p_data->>'location',''),coalesce(p_data->>'details','')) returning id into v_id;
  insert into public.community_members values(v_id,u);
 elsif p_action='identity_save' then
  if not public.community_manages(v_id) then raise exception 'not_authorized' using errcode='42501'; end if;
  select * into strict v_identity from public.community_identities where id=v_id for update;
  v_image:=nullif(p_data->>'image_path','');
  if v_image is distinct from v_identity.image_path and v_image is not null and
   (split_part(v_image,'/',1)<>v_folder::text or v_image like '%..%') then raise exception 'invalid_image' using errcode='42501'; end if;
  update public.community_identities set display_name=btrim(p_data->>'display_name'), description=coalesce(p_data->>'description',''),
   location=coalesce(p_data->>'location',''),details=coalesce(p_data->>'details',''),image_path=v_image,updated_at=now() where id=v_id;
 elsif p_action='market_reference' then
  select * into strict v_catalog from public.community_market_catalog where source_id=p_data->>'source_market_id';
  insert into public.community_identities(kind,display_name,location,source_market_id,lat,lng)
   values('market',left(v_catalog.name,80),v_catalog.city||', '||v_catalog.state,v_catalog.source_id,v_catalog.lat,v_catalog.lng)
   on conflict(source_market_id) do nothing;
  select id into v_id from public.community_identities where source_market_id=v_catalog.source_id;
 elsif p_action='market_request' then
  if nullif(p_data->>'source_market_id','') is not null then
   select * into strict v_catalog from public.community_market_catalog where source_id=p_data->>'source_market_id';
   insert into public.community_identities(kind,display_name,location,source_market_id,lat,lng)
    values('market',left(v_catalog.name,80),v_catalog.city||', '||v_catalog.state,v_catalog.source_id,v_catalog.lat,v_catalog.lng)
    on conflict(source_market_id) do nothing;
   select id into v_market from public.community_identities where source_market_id=v_catalog.source_id;
  else v_market:=nullif(p_data->>'market_id','')::uuid; end if;
  if v_market is not null and not exists(select 1 from public.community_identities where id=v_market and kind='market') then raise exception 'invalid_market'; end if;
  insert into public.community_organizer_requests(applicant_id,market_id,proposed_name,evidence)
   values(u,v_market,case when v_market is null then btrim(p_data->>'display_name') end,btrim(p_data->>'evidence')) returning id into v_id;
 elsif p_action='market_review' then
  if not public.community_is_admin() then raise exception 'not_authorized' using errcode='42501'; end if;
  select * into strict v_claim from public.community_organizer_requests where id=v_id for update;
  v_status:=p_data->>'status';
  if v_claim.status<>'pending' or v_status not in ('approved','rejected') then raise exception 'invalid_transition'; end if;
  if v_status='approved' then
   if v_claim.applicant_id=u then raise exception 'self_approval_forbidden' using errcode='42501'; end if;
   v_market:=v_claim.market_id;
   if v_market is null then
    insert into public.community_identities(kind,display_name) values('market',v_claim.proposed_name) returning id into v_market;
   end if;
   insert into public.community_members values(v_market,v_claim.applicant_id) on conflict do nothing;
  end if;
  update public.community_organizer_requests set status=v_status,market_id=coalesce(v_market,market_id),reviewed_by=u,reviewed_at=now() where id=v_id;
 elsif p_action='member_revoke' then
  if not public.community_is_admin() then raise exception 'not_authorized' using errcode='42501'; end if;
  delete from public.community_members where identity_id=v_id and user_id=(p_data->>'user_id')::uuid
   and exists(select 1 from public.community_identities where id=v_id and kind='market');
 elsif p_action='affiliation_request' then
  v_vendor:=(p_data->>'vendor_id')::uuid; v_market:=(p_data->>'market_id')::uuid;
  if not public.community_manages(v_vendor) or not exists(select 1 from public.community_identities where id=v_vendor and kind='vendor')
   or not exists(select 1 from public.community_identities where id=v_market and kind='market') then raise exception 'not_authorized' using errcode='42501'; end if;
  insert into public.community_affiliations(vendor_id,market_id,requested_by) values(v_vendor,v_market,u)
   on conflict(vendor_id,market_id) do update set status='pending',requested_by=u,reviewed_by=null,reviewed_at=null
    where community_affiliations.status in ('rejected','revoked') returning id into v_id;
  if v_id is null then raise exception 'already_requested'; end if;
 elsif p_action='affiliation_review' then
  select * into strict v_aff from public.community_affiliations where id=v_id for update;
  if not public.community_manages(v_aff.market_id) or public.community_manages(v_aff.vendor_id) then raise exception 'not_authorized' using errcode='42501'; end if;
  v_status:=p_data->>'status';
  if not ((v_aff.status='pending' and v_status in ('approved','rejected')) or (v_aff.status='approved' and v_status='revoked')) then raise exception 'invalid_transition'; end if;
  update public.community_affiliations set status=v_status,reviewed_by=u,reviewed_at=now() where id=v_id;
 elsif p_action='post_save' then
  v_author:=(p_data->>'author_id')::uuid; v_market:=nullif(p_data->>'market_id','')::uuid;
  if not public.community_manages(v_author) then raise exception 'not_authorized' using errcode='42501'; end if;
  select * into strict v_identity from public.community_identities where id=v_author;
  if v_market is not null and not ((v_identity.kind='market' and v_market=v_author) or
   (v_identity.kind='vendor' and exists(select 1 from public.community_affiliations where vendor_id=v_author and market_id=v_market and status='approved'))) then
   raise exception 'market_affiliation_required' using errcode='42501'; end if;
  v_image:=nullif(p_data->>'image_path',''); v_category:=p_data->>'category';
  if v_id is not null then
   select * into strict v_post from public.community_posts where id=v_id for update;
   if v_post.author_id<>v_author then raise exception 'immutable_author' using errcode='42501'; end if;
  end if;
  if v_image is not null and v_image is distinct from v_post.image_path and (split_part(v_image,'/',1)<>v_folder::text or v_image like '%..%') then raise exception 'invalid_image' using errcode='42501'; end if;
  if v_id is null then
   insert into public.community_posts(author_id,body,category,market_id,image_path,expires_at)
    values(v_author,btrim(p_data->>'body'),v_category,v_market,v_image,nullif(p_data->>'expires_at','')::timestamptz) returning id into v_id;
  else
   update public.community_posts set body=btrim(p_data->>'body'),category=v_category,market_id=v_market,image_path=v_image,
    expires_at=nullif(p_data->>'expires_at','')::timestamptz,updated_at=now() where id=v_id;
  end if;
 elsif p_action='post_delete' then
  select * into strict v_post from public.community_posts where id=v_id;
  if not public.community_manages(v_post.author_id) and not public.community_is_admin() then raise exception 'not_authorized' using errcode='42501'; end if;
  delete from public.community_posts where id=v_id;
 elsif p_action='comment_save' then
  -- Comments always use the person's identity; business identities are used for posts.
  select id into strict v_author from public.community_identities where personal_user_id=u;
  v_parent:=nullif(p_data->>'parent_id','')::uuid;
  if v_id is null then
   if v_parent is not null and not exists(select 1 from public.community_comments where id=v_parent and post_id=(p_data->>'post_id')::uuid and parent_id is null) then raise exception 'invalid_reply'; end if;
   insert into public.community_comments(post_id,author_id,parent_id,body) values((p_data->>'post_id')::uuid,v_author,v_parent,btrim(p_data->>'body')) returning id into v_id;
  else
   update public.community_comments set body=btrim(p_data->>'body'),updated_at=now() where id=v_id and author_id=v_author;
   if not found then raise exception 'not_authorized' using errcode='42501'; end if;
  end if;
 elsif p_action='comment_delete' then
  select * into strict v_comment from public.community_comments where id=v_id;
  if not public.community_manages(v_comment.author_id) and not public.community_is_admin() then raise exception 'not_authorized' using errcode='42501'; end if;
  delete from public.community_comments where id=v_id;
 elsif p_action in ('like','save') then
  if not exists(select 1 from public.community_posts where id=v_id) then raise exception 'post_removed'; end if;
  if p_action='like' then
   if coalesce((p_data->>'enabled')::boolean,false) then insert into public.community_likes values(u,v_id) on conflict do nothing;
   else delete from public.community_likes where user_id=u and post_id=v_id; end if;
  else
   if coalesce((p_data->>'enabled')::boolean,false) then insert into public.community_saves values(u,v_id) on conflict do nothing;
   else delete from public.community_saves where user_id=u and post_id=v_id; end if;
  end if;
 elsif p_action='follow' then
  if not exists(select 1 from public.community_identities where id=v_id and kind in ('vendor','market')) then raise exception 'invalid_follow'; end if;
  if coalesce((p_data->>'enabled')::boolean,false) then insert into public.community_follows values(u,v_id) on conflict do nothing;
  else delete from public.community_follows where user_id=u and identity_id=v_id; end if;
 elsif p_action='report' then
  if not ((p_data->>'target_kind'='post' and exists(select 1 from public.community_posts where id=v_id)) or
   (p_data->>'target_kind'='comment' and exists(select 1 from public.community_comments where id=v_id))) then raise exception 'invalid_report'; end if;
  insert into public.community_reports(reporter_id,target_id,target_kind,reason) values(u,v_id,p_data->>'target_kind',btrim(p_data->>'reason')) on conflict do nothing;
 elsif p_action='report_resolve' then
  if not public.community_is_admin() then raise exception 'not_authorized' using errcode='42501'; end if;
  update public.community_reports set resolved=true where id=v_id;
 else raise exception 'unknown_command'; end if;
 insert into public.community_audit(actor_id,action,target_id) values(u,p_action,coalesce(v_id,u));
 if p_action in ('profile_save','vendor_create','identity_save','market_reference','market_review','member_revoke','affiliation_review') then
  update public.community_public_updates set version=version+1 where id=1;
 end if;
 return jsonb_build_object('id',v_id);
end; $$;

-- Public cards return aggregates, never the private lists of who liked/followed/saved.
create function public.community_feed(p_mode text default 'latest',p_author uuid default null,p_market uuid default null,
 p_limit integer default 20,p_offset integer default 0,p_lat double precision default null,p_lng double precision default null)
returns setof jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(p) || jsonb_build_object(
  'author',to_jsonb(i)-'personal_user_id','market',case when m.id is not null then to_jsonb(m)-'personal_user_id' end,
  'verified',exists(select 1 from public.community_affiliations a where a.vendor_id=p.author_id and a.market_id=p.market_id and a.status='approved'),
  'like_count',(select count(*) from public.community_likes where post_id=p.id),
  'comment_count',(select count(*) from public.community_comments where post_id=p.id),
  'liked',exists(select 1 from public.community_likes where post_id=p.id and user_id=auth.uid()),
  'saved',exists(select 1 from public.community_saves where post_id=p.id and user_id=auth.uid()),
  'following',exists(select 1 from public.community_follows where identity_id=p.author_id and user_id=auth.uid()),
  'expired',p.category='offer' and p.expires_at is not null and p.expires_at<=now())
 from public.community_posts p join public.community_identities i on i.id=p.author_id
 left join public.community_identities m on m.id=p.market_id
 where (p_author is null or p.author_id=p_author)
 and (p_market is null or (p.market_id=p_market and (p.author_id=p_market or exists(select 1 from public.community_affiliations a where a.vendor_id=p.author_id and a.market_id=p_market and a.status='approved'))))
 and (p_mode<>'following' or exists(select 1 from public.community_follows where user_id=auth.uid() and identity_id=p.author_id))
 and (p_mode<>'saved' or exists(select 1 from public.community_saves where user_id=auth.uid() and post_id=p.id))
 and (p_mode<>'nearby' or (p_lat between -90 and 90 and p_lng between -180 and 180 and m.lat is not null and
  6371*2*asin(sqrt(least(1.0,power(sin(radians(m.lat-p_lat)/2),2)+cos(radians(p_lat))*cos(radians(m.lat))*power(sin(radians(m.lng-p_lng)/2),2))))<=50))
 order by case when p_mode='for_you' and exists(select 1 from public.community_follows where user_id=auth.uid() and identity_id=p.author_id) then 0 else 1 end,
 p.created_at desc,p.id desc limit least(greatest(p_limit,1),30) offset least(greatest(p_offset,0),10000);
$$;

-- Private review details are never exposed through public relationship reads.
-- Return null for absent or unauthorized rows, without revealing whether an ID exists.
create function public.community_affiliation_private(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',a.id,'requested_by',a.requested_by,'reviewed_by',a.reviewed_by,
  'reviewed_at',a.reviewed_at,'created_at',a.created_at)
 from public.community_affiliations a
 where a.id=p_id and auth.uid() is not null and
  (public.community_manages(a.vendor_id) or public.community_manages(a.market_id) or public.community_is_admin());
$$;
revoke all on function public.community_affiliation_private(uuid) from public,anon,authenticated;
grant execute on function public.community_affiliation_private(uuid) to authenticated;

-- All public function execution grants are explicit. Trigger functions are not callable clients.
create function public.community_identity(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select (to_jsonb(i)-'personal_user_id') || jsonb_build_object(
  'follower_count',(select count(*) from public.community_follows where identity_id=i.id),
  'following',exists(select 1 from public.community_follows where identity_id=i.id and user_id=auth.uid()),
  'managed',public.community_manages(i.id),
  'organizer_approved',i.kind='market' and exists(select 1 from public.community_members where identity_id=i.id))
 from public.community_identities i where i.id=p_id;
$$;
revoke all on function public.community_identity(uuid) from public,anon,authenticated;
grant execute on function public.community_identity(uuid) to anon,authenticated;
revoke all on function public.community_initialize_user() from public,anon,authenticated;
revoke all on function public.community_is_admin(),public.community_manages(uuid),public.community_command(text,jsonb),
 public.community_feed(text,uuid,uuid,integer,integer,double precision,double precision) from public,anon,authenticated;
grant execute on function public.community_is_admin(),public.community_manages(uuid) to anon,authenticated;
grant execute on function public.community_command(text,jsonb) to authenticated;
grant execute on function public.community_feed(text,uuid,uuid,integer,integer,double precision,double precision) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('community-images','community-images',true,5242880,array['image/jpeg','image/png','image/webp']);
-- Public URLs serve image bytes without this policy. Metadata/listing is owner-only
-- because Storage metadata can contain owner_id (an Auth UUID).
create policy community_images_read on storage.objects for select to authenticated using(
 bucket_id='community-images' and (storage.foldername(name))[1]=
  (select image_folder::text from public.community_profiles where id=auth.uid()));
create policy community_images_insert on storage.objects for insert to authenticated with check(
 bucket_id='community-images' and (storage.foldername(name))[1]=
  (select image_folder::text from public.community_profiles where id=auth.uid()) and name not like '%..%');
create policy community_images_delete on storage.objects for delete to authenticated using(
 bucket_id='community-images' and (storage.foldername(name))[1]=
  (select image_folder::text from public.community_profiles where id=auth.uid()));
do $$ declare n text; begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach n in array array['community_posts','community_comments','community_public_updates'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=n) then
    execute format('alter publication supabase_realtime add table public.%I',n);
   end if;
  end loop;
 end if;
end $$;
commit;
