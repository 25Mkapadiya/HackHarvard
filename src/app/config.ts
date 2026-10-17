// Runtime configuration. Everything here is public: the site is static.
export const BACKEND = (import.meta.env.VITE_BACKEND ?? 'demo') as 'demo' | 'supabase';
export const TILE_URL = import.meta.env.VITE_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const REPO_URL = 'https://github.com/25Mkapadiya/HackHarvard';
export const dataUrl = (path: string) => `${import.meta.env.BASE_URL}data/${path}`;
