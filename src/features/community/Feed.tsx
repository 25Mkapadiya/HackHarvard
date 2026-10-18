import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useLocationState } from '../../app/context';
import { LocationPicker } from '../markets/LocationPicker';
import { useAuth } from '../auth/authContext';
import {
  affiliations,
  identityFields,
  client,
  command,
  imageUrl,
  removeImage,
  result,
  upload,
  workspace,
  type Comment,
  type Identity,
  type Post,
} from './api';
import { useRemote, useTask } from './hooks';
import { Feedback, Page, RemoteState } from './Common';
import { localDateInput } from './format';

export function Composer({
  identities,
  post,
  onDone,
}: {
  identities: Identity[];
  post?: Post;
  onDone?: () => void;
}) {
  const auth = useAuth();
  const { t } = useTranslation();
  const task = useTask();
  const [author, setAuthor] = useState(post?.author_id ?? identities[0]?.id ?? '');
  const [body, setBody] = useState(post?.body ?? '');
  const [category, setCategory] = useState<Post['category']>(post?.category ?? 'general');
  const [market, setMarket] = useState(post?.market_id ?? '');
  const [expires, setExpires] = useState(() => localDateInput(post?.expires_at ?? null));
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(post?.image_path ?? null);
  const relations = useRemote(useCallback(() => affiliations(), []));
  const selected = identities.find((i) => i.id === author);
  const markets =
    selected?.kind === 'market'
      ? [selected]
      : (relations.data ?? [])
          .filter((a) => a.vendor_id === author && a.status === 'approved')
          .map((a) => a.market!)
          .filter(Boolean);
  async function submit(event: FormEvent) {
    event.preventDefault();
    let uploaded: string | null = null;
    await task.run(async () => {
      try {
        if (file && auth.user) uploaded = await upload(file, auth.user.id);
        await command('post_save', {
          id: post?.id,
          author_id: author,
          body,
          category,
          market_id: selected?.kind === 'market' ? author : market || null,
          expires_at: category === 'offer' && expires ? new Date(expires).toISOString() : null,
          image_path: uploaded ?? path,
        });
        if (post?.image_path && post.image_path !== (uploaded ?? path)) await removeImage(post.image_path);
        if (!post) {
          setBody('');
          setFile(null);
          if (fileInput.current) fileInput.current.value = '';
          setPath(null);
          setExpires('');
        }
        onDone?.();
      } catch (error) {
        if (uploaded) await removeImage(uploaded);
        throw error;
      }
    });
  }
  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <p className="text-sm text-ink-soft">{t('community.postHelp')}</p>
      <fieldset disabled={task.busy} className="space-y-3">
        <label className="label">
          {t('community.postAs')}
          <select
            className="field"
            required
            disabled={!!post}
            value={author}
            onChange={(e) => {
              setAuthor(e.target.value);
              setMarket('');
            }}
          >
            {identities.map((i) => (
              <option key={i.id} value={i.id}>
                {i.display_name} · {t(`community.kind.${i.kind}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          {t('community.body')}
          <textarea
            className="field min-h-28"
            required
            maxLength={3000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="label">
            {t('community.category')}
            <select
              className="field"
              value={category}
              onChange={(e) => setCategory(e.target.value as Post['category'])}
            >
              {['general', 'announcement', 'offer', 'seasonal'].map((c) => (
                <option key={c} value={c}>
                  {t(`community.categories.${c}`)}
                </option>
              ))}
            </select>
          </label>
          {selected?.kind === 'vendor' && (
            <label className="label">
              {t('community.marketTag')}
              <select className="field" value={market} onChange={(e) => setMarket(e.target.value)}>
                <option value="">{t('community.noMarketTag')}</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {category === 'offer' && (
          <label className="label">
            {t('community.expires')}
            <input
              type="datetime-local"
              className="field"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </label>
        )}
        <label className="label">
          {t('community.photo')}
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {path && (
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              setPath(null);
              setFile(null);
              if (fileInput.current) fileInput.current.value = '';
            }}
          >
            {t('community.removeImage')}
          </button>
        )}
        <div className="flex gap-2">
          <button className="btn-primary">{t(post ? 'community.save' : 'community.publish')}</button>
          {post && (
            <button className="btn-secondary" type="button" onClick={onDone}>
              {t('community.cancel')}
            </button>
          )}
        </div>
      </fieldset>
      <Feedback task={task} />
    </form>
  );
}
function Report({ id, kind }: { id: string; kind: 'post' | 'comment' }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const task = useTask();
  return (
    <>
      <button type="button" className="btn-quiet text-sm" onClick={() => setOpen(!open)} aria-expanded={open}>
        {t('community.report')}
      </button>
      {open && (
        <form
          className="space-y-2 border-t border-line py-3"
          onSubmit={(e) => {
            e.preventDefault();
            void task.run(() => command('report', { id, target_kind: kind, reason }), 'community.reportSent');
          }}
        >
          <label className="label">
            {t('community.reportReason')}
            <textarea
              className="field"
              required
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button className="btn-secondary" disabled={task.busy}>
            {t('community.submit')}
          </button>
          <Feedback task={task} />
        </form>
      )}
    </>
  );
}
function Comments({ postId, identities }: { postId: string; identities: Identity[] }) {
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const task = useTask();
  const [body, setBody] = useState('');
  const [reply, setReply] = useState<Comment | null>(null);
  const [editing, setEditing] = useState<Comment | null>(null);
  const remote = useRemote(
    useCallback(
      async () =>
        result<Comment[]>(
          await client()
            .from('community_comments')
            .select(`*,author:community_identities!author_id(${identityFields})`)
            .eq('post_id', postId)
            .order('created_at')
            .limit(200),
        ),
      [postId],
    ),
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      await task.run(() =>
        command('comment_save', { id: editing?.id, post_id: postId, parent_id: reply?.id, body }),
      )
    ) {
      setBody('');
      setReply(null);
      setEditing(null);
    }
  }
  function card(comment: Comment, child = false) {
    const owned = identities.some((i) => i.id === comment.author_id);
    return (
      <article
        key={comment.id}
        className={`${child ? 'ml-5 border-l-2 pl-3' : ''} space-y-1 border-line py-3`}
      >
        <Link className="font-bold" to={`/community/profile/${comment.author_id}`}>
          {comment.author.display_name}
        </Link>{' '}
        <time className="text-sm text-ink-soft" dateTime={comment.created_at}>
          {new Date(comment.created_at).toLocaleDateString(i18n.language)}
        </time>
        <p className="whitespace-pre-wrap break-words">{comment.body}</p>
        {auth.user && (
          <div className="flex flex-wrap gap-1">
            {!child && (
              <button
                className="btn-quiet text-sm"
                onClick={() => {
                  setReply(comment);
                  setEditing(null);
                  setBody('');
                }}
              >
                {t('community.reply')}
              </button>
            )}
            {owned && (
              <>
                <button
                  className="btn-quiet text-sm"
                  onClick={() => {
                    setEditing(comment);
                    setReply(null);
                    setBody(comment.body);
                  }}
                >
                  {t('community.edit')}
                </button>
                <button
                  className="btn-quiet text-sm"
                  disabled={task.busy}
                  onClick={() => {
                    if (window.confirm(t('community.confirmDelete')))
                      void task.run(() => command('comment_delete', { id: comment.id }));
                  }}
                >
                  {t('community.delete')}
                </button>
              </>
            )}
            <Report id={comment.id} kind="comment" />
          </div>
        )}
      </article>
    );
  }
  return (
    <section className="space-y-3 border-t border-line pt-3">
      <RemoteState remote={remote} />
      {remote.data
        ?.filter((c) => !c.parent_id)
        .map((c) => (
          <div key={c.id}>
            {card(c)}
            {remote.data?.filter((r) => r.parent_id === c.id).map((r) => card(r, true))}
          </div>
        ))}
      {auth.user && (
        <form className="space-y-2" onSubmit={submit}>
          {reply && <p>{t('community.replyTo', { name: reply.author.display_name })}</p>}
          <label className="label">
            {t('community.commentBody')}
            <textarea
              className="field"
              required
              maxLength={1000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <button className="btn-secondary" disabled={task.busy}>
            {t(editing ? 'community.save' : 'community.publish')}
          </button>
          {(reply || editing) && (
            <button
              type="button"
              className="btn-quiet"
              onClick={() => {
                setReply(null);
                setEditing(null);
                setBody('');
              }}
            >
              {t('community.cancel')}
            </button>
          )}
          <Feedback task={task} />
        </form>
      )}
    </section>
  );
}
export function PostCard({ post, identities }: { post: Post; identities: Identity[] }) {
  const { t, i18n } = useTranslation();
  const auth = useAuth();
  const task = useTask();
  const [comments, setComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const owned = identities.some((i) => i.id === post.author_id);
  const time = new Date(post.created_at);
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    if (!post.expires_at) return;
    const remaining = new Date(post.expires_at).getTime() - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => setClock(Date.now()), Math.min(remaining + 50, 2147483647));
    return () => clearTimeout(timer);
  }, [post.expires_at, clock]);
  const expired =
    post.category === 'offer' &&
    !!post.expires_at &&
    (post.expired || new Date(post.expires_at).getTime() <= clock);
  if (editing) return <Composer identities={identities} post={post} onDone={() => setEditing(false)} />;
  return (
    <article className="card space-y-4 p-5">
      <header className="flex gap-3">
        {post.author.image_path && (
          <img
            className="h-12 w-12 rounded-full object-cover"
            src={imageUrl(post.author.image_path)}
            alt=""
            loading="lazy"
          />
        )}
        <div>
          <Link to={`/community/profile/${post.author_id}`} className="font-bold">
            {post.author.display_name}
          </Link>
          <p className="text-sm text-ink-soft">
            {t(`community.kind.${post.author.kind}`)} ·{' '}
            <time dateTime={post.created_at}>{time.toLocaleString(i18n.language)}</time>
          </p>
        </div>
      </header>
      <p>
        <span className="chip">{t(`community.categories.${post.category}`)}</span>{' '}
        {expired && <strong className="text-beet">{t('community.expired')}</strong>}
      </p>
      <p className="whitespace-pre-wrap break-words">{post.body}</p>
      {post.image_path && (
        <img
          className="max-h-96 w-full rounded-lg object-contain"
          src={imageUrl(post.image_path)}
          alt={t('community.postImage')}
          loading="lazy"
        />
      )}
      {post.market && (
        <p className="text-sm">
          <Link to={`/community/profile/${post.market.id}`}>{post.market.display_name}</Link>
          {post.verified && (
            <span className="ml-2 font-bold text-kale" title={t('community.verificationNote')}>
              {t('community.verification', { market: post.market.display_name })}
            </span>
          )}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {auth.user && (
          <>
            <button
              className="btn-secondary"
              disabled={task.busy}
              onClick={() => void task.run(() => command('like', { id: post.id, enabled: !post.liked }), '')}
              aria-pressed={post.liked}
            >
              {t(post.liked ? 'community.unlike' : 'community.like')} ({post.like_count})
            </button>
            <button
              className="btn-quiet"
              disabled={task.busy}
              onClick={() => void task.run(() => command('save', { id: post.id, enabled: !post.saved }), '')}
              aria-pressed={post.saved}
            >
              {t(post.saved ? 'community.unsavePost' : 'community.savePost')}
            </button>
            {post.author.kind !== 'customer' && (
              <button
                className="btn-quiet"
                disabled={task.busy}
                aria-pressed={post.following}
                onClick={() =>
                  void task.run(() => command('follow', { id: post.author_id, enabled: !post.following }), '')
                }
              >
                {t(post.following ? 'community.unfollow' : 'community.follow')}
              </button>
            )}
          </>
        )}
        {!auth.user && (
          <span>
            {t('community.like')} ({post.like_count})
          </span>
        )}
        <button className="btn-quiet" onClick={() => setComments(!comments)} aria-expanded={comments}>
          {t('community.comment')} ({post.comment_count})
        </button>
        {owned && (
          <>
            <button className="btn-quiet" onClick={() => setEditing(true)}>
              {t('community.edit')}
            </button>
            <button
              className="btn-quiet"
              disabled={task.busy}
              onClick={() => {
                if (window.confirm(t('community.confirmDelete')))
                  void task.run(async () => {
                    await command('post_delete', { id: post.id });
                    await removeImage(post.image_path);
                  });
              }}
            >
              {t('community.delete')}
            </button>
          </>
        )}
        {auth.user && <Report id={post.id} kind="post" />}
      </div>
      <Feedback task={task} />
      {comments && <Comments postId={post.id} identities={identities} />}
    </article>
  );
}
export function FeedStream({
  author,
  market,
  showComposer = true,
}: {
  author?: string;
  market?: string;
  showComposer?: boolean;
}) {
  const { t } = useTranslation();
  const auth = useAuth();
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') ?? 'for_you';
  const [pages, setPages] = useState(1);
  const location = useLocationState();
  const mine = useRemote(useCallback(() => workspace(auth.user?.id ?? null), [auth.user?.id]));
  // Refresh every loaded page after changes so revoked badges/deleted posts never linger in older pages.
  const remote = useRemote(
    useCallback(async () => {
      const chunks = await Promise.all(
        Array.from({ length: pages }, (_, page) =>
          client().rpc('community_feed', {
            p_mode: mode,
            p_author: author ?? null,
            p_market: market ?? null,
            p_limit: 20,
            p_offset: page * 20,
            p_lat: location.origin.lat,
            p_lng: location.origin.lng,
          }),
        ),
      );
      return chunks.flatMap((chunk) => result<Post[]>(chunk));
    }, [mode, author, market, pages, location.origin.lat, location.origin.lng]),
  );
  const posts = (remote.data ?? []).filter(
    (post, index, all) => all.findIndex((p) => p.id === post.id) === index,
  );
  return (
    <div className="space-y-5">
      {showComposer &&
        (auth.user ? (
          mine.data?.identities.length ? (
            <Composer key={mine.data.identities.map((i) => i.id).join()} identities={mine.data.identities} />
          ) : (
            <>
              <RemoteState remote={mine} />
              <p>{t('community.noIdentities')}</p>
            </>
          )
        ) : (
          <p>
            {t('community.signedOut')} <Link to="/login">{t('auth.login')}</Link>
          </p>
        ))}
      <nav className="flex flex-wrap gap-2" aria-label={t('community.feed')}>
        {['for_you', 'following', 'nearby', 'latest', 'saved'].map((value) => (
          <button
            className={mode === value ? 'btn-primary' : 'btn-secondary'}
            key={value}
            onClick={() => {
              setParams({ mode: value });
              setPages(1);
            }}
            aria-pressed={mode === value}
          >
            {t(value === 'saved' ? 'community.savedPosts' : `community.${value}`)}
          </button>
        ))}
      </nav>
      <p className="text-sm text-ink-soft">{t('community.ranking')}</p>
      {mode === 'nearby' && (
        <div className="card space-y-3 p-4">
          <p>{t('community.nearbyHint')}</p>
          <LocationPicker />
        </div>
      )}
      {!auth.user && ['following', 'saved'].includes(mode) && (
        <p>
          <Link to="/login">{t('community.loginRequired')}</Link>
        </p>
      )}
      <button className="btn-quiet" onClick={remote.reload}>
        {t('community.refresh')}
      </button>
      <RemoteState remote={remote} />
      {posts.map((post) => (
        <PostCard key={post.id} post={post} identities={mine.data?.identities ?? []} />
      ))}
      {!remote.loading && !remote.error && !posts.length && (
        <div className="card p-8 text-center">{t('community.emptyFeed')}</div>
      )}
      {posts.length >= pages * 20 && pages < 25 && (
        <button className="btn-secondary" disabled={remote.loading} onClick={() => setPages((n) => n + 1)}>
          {t('community.more')}
        </button>
      )}
    </div>
  );
}
export default function Feed() {
  const { t } = useTranslation();
  return (
    <Page title={t('community.feed')}>
      <div className="flex flex-wrap gap-3">
        <Link to="/community/markets">{t('community.directory')}</Link>
        <Link to="/account/identities">{t('community.manage')}</Link>
      </div>
      <FeedStream />
    </Page>
  );
}
