import { spawnSync } from 'node:child_process';
// Only explicit public build settings enter this artifact. Vite also disables .env loading.
const passthrough = [
  'PATH',
  'HOME',
  'USER',
  'LOGNAME',
  'TMPDIR',
  'TEMP',
  'TMP',
  'LANG',
  'LC_ALL',
  'CI',
  'TERM',
];
const env = Object.fromEntries(
  passthrough.filter((key) => process.env[key] !== undefined).map((key) => [key, process.env[key]]),
);
Object.assign(env, {
  NODE_ENV: 'production',
  VITE_BASE: '/',
  VITE_BACKEND: 'demo',
  VITE_DEVELOPMENT_PREVIEW: 'true',
});
for (const args of [
  ['node_modules/typescript/bin/tsc', '-b'],
  ['node_modules/vite/bin/vite.js', 'build'],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
