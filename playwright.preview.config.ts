import { defineConfig } from '@playwright/test';
const publicUrl = process.env.PUBLIC_PREVIEW_URL;
/** Runs the existing flows against a root-hosted build or an anonymous public deployment. */
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL: publicUrl ?? 'http://localhost:4174/',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  webServer: publicUrl
    ? undefined
    : {
        command: 'npx vite preview --base / --host 127.0.0.1 --port 4174 --strictPort',
        url: 'http://localhost:4174/',
        reuseExistingServer: true,
      },
});
