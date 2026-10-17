import { latestRaw, log, saveRaw, today } from './io';

export const USER_AGENT = 'MarketDayBoston/0.1 (+https://github.com/25Mkapadiya/HackHarvard)';

export async function fetchText(
  url: string,
  opts: { retries?: number; timeoutMs?: number; init?: RequestInit } = {},
) {
  const { retries = 3, timeoutMs = 60_000, init } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'User-Agent': USER_AGENT, ...(init?.headers ?? {}) },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      // 4xx won't fix itself on retry.
      if (err instanceof Error && /HTTP 4\d\d/.test(err.message)) break;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw lastErr;
}

export type Fetched<T> = { data: T; fetchedAt: string; status: 'ok' | 'snapshot'; note?: string };

/**
 * Fetches a source, saves the raw body as today's snapshot, and falls back to the most
 * recent snapshot when the network call fails. `slim` can shrink a huge response before saving.
 */
export async function fetchWithSnapshot<T>(
  source: string,
  ext: string,
  load: () => Promise<string>,
  parse: (body: string) => T,
  slim?: (body: string) => string,
): Promise<Fetched<T>> {
  try {
    const body = await load();
    const saved = slim ? slim(body) : body;
    const data = parse(saved);
    saveRaw(source, ext, saved);
    return { data, fetchedAt: today(), status: 'ok' };
  } catch (err) {
    const snap = latestRaw(source);
    const reason = err instanceof Error ? err.message : String(err);
    if (!snap) throw new Error(`${source}: fetch failed (${reason}) and no snapshot exists`, { cause: err });
    log(source, `fetch failed (${reason}); using snapshot from ${snap.date}`);
    return {
      data: parse(snap.body),
      fetchedAt: snap.date,
      status: 'snapshot',
      note: `Live fetch failed: ${reason}`,
    };
  }
}
