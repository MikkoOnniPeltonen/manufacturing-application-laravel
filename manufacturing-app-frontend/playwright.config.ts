import { defineConfig } from '@playwright/test';

const apiPort = process.env.E2E_API_PORT || '8000';
const frontendPort = process.env.E2E_FRONTEND_PORT || '5173';
const apiOrigin = `http://localhost:${apiPort}`;
const frontendOrigin = `http://localhost:${frontendPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: frontendOrigin, trace: 'retain-on-failure' },
  reporter: 'list',
  webServer: [
    {
      command: `pnpm exec concurrently --kill-others "php artisan serve --host=127.0.0.1 --port=${apiPort}" "php artisan queue:work database --sleep=1 --tries=3 --timeout=60"`,
      cwd: '../manufacturing-laravel-backend',
      url: `${apiOrigin}/up`,
      reuseExistingServer: false,
      env: {
        APP_ENV: 'local', SESSION_DRIVER: 'file', CACHE_STORE: 'array', DEMO_MODE: 'true',
        QUEUE_CONNECTION: 'database', APP_URL: apiOrigin, FRONTEND_URL: frontendOrigin,
        SANCTUM_STATEFUL_DOMAINS: `localhost:${frontendPort}`,
      },
    },
    {
      command: `pnpm dev --host localhost --port ${frontendPort} --strictPort`,
      url: frontendOrigin,
      reuseExistingServer: false,
      env: { VITE_BACKEND_ORIGIN: apiOrigin },
    },
  ],
});
