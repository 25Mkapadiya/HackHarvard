// Day tokens for QR check-ins. In demo mode this is only a speed bump (the secret ships in the
// bundle): it stops people from checking in by editing a URL to a different day. A real
// deployment would sign tokens server-side (e.g. a Supabase edge function).
const SALT = 'market-day-demo';

function fnv(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

export const dayToken = (marketId: string, isoDate: string) => fnv(`${SALT}|${marketId}|${isoDate}`);
export const checkToken = (marketId: string, isoDate: string, token: string) =>
  dayToken(marketId, isoDate) === token;
