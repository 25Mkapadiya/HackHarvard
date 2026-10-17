import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '../..');
export const RAW_DIR = path.join(ROOT, 'data/raw');
export const today = () => new Date().toISOString().slice(0, 10);

export function readJson<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
}

export function writeJson(rel: string, value: unknown, pretty = false) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, pretty ? 2 : undefined) + '\n');
}

export function writeText(rel: string, text: string) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

export const log = (source: string, msg: string) => console.log(`[${source}] ${msg}`);

/** Saves today's snapshot for a source and removes older ones (git history keeps them). */
export function saveRaw(source: string, ext: string, body: string): string {
  const dir = path.join(RAW_DIR, source);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f));
  const file = path.join(dir, `${today()}.${ext}`);
  fs.writeFileSync(file, body);
  return file;
}

/** Most recent snapshot for a source, if any: { body, date }. */
export function latestRaw(source: string): { body: string; date: string } | null {
  const dir = path.join(RAW_DIR, source);
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\./.test(f))
    .sort();
  const last = files.at(-1);
  if (!last) return null;
  return { body: fs.readFileSync(path.join(dir, last), 'utf8'), date: last.slice(0, 10) };
}
