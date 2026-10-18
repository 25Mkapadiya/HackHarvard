type Callback =
  | { kind: 'token'; token: string; type: 'signup' | 'email' | 'recovery' }
  | { kind: 'implicit'; access: string; refresh: string; type: string }
  | { kind: 'code'; code: string; type: string }
  | { kind: 'invalid' };

let pending: Callback | null = null;
export function callbackUrl(flow: 'signup' | 'recovery') {
  return `${window.location.origin}${import.meta.env.BASE_URL}?flow=${flow}`;
}
// Capture once before mounting HashRouter. Remove all secrets from the address/history immediately.
export function captureAuthCallback(
  location: Pick<Location, 'search' | 'hash' | 'pathname'>,
  history: Pick<History, 'replaceState'>,
) {
  const query = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.replace(/^#/, '').replace(/^\/auth\/callback\?/, ''));
  const keys = [
    'token_hash',
    'code',
    'access_token',
    'refresh_token',
    'error',
    'error_code',
    'error_description',
  ];
  const params = keys.some((key) => query.has(key)) ? query : fragment;
  if (!keys.some((key) => params.has(key))) return false;
  const type = params.get('type') ?? query.get('flow') ?? 'signup';
  if (params.has('error') || params.has('error_code')) pending = { kind: 'invalid' };
  else if (params.get('token_hash') && ['signup', 'email', 'recovery'].includes(type)) {
    pending = {
      kind: 'token',
      token: params.get('token_hash')!,
      type: type as 'signup' | 'email' | 'recovery',
    };
  } else if (params.get('access_token') && params.get('refresh_token')) {
    pending = {
      kind: 'implicit',
      access: params.get('access_token')!,
      refresh: params.get('refresh_token')!,
      type,
    };
  } else if (params.get('code')) pending = { kind: 'code', code: params.get('code')!, type };
  else pending = { kind: 'invalid' };
  history.replaceState(null, '', `${location.pathname}#/auth/callback`);
  return true;
}
export function takeAuthCallback() {
  const result = pending;
  pending = null;
  return result;
}
export function hasAuthCallback() {
  return pending !== null && pending.kind !== 'invalid';
}
