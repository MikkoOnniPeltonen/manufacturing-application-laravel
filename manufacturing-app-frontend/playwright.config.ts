import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  reporter: 'list',
  webServer: [
    {
      command: 'pnpm exec concurrently --kill-others "php artisan serve --host=127.0.0.1 --port=8000" "php artisan queue:work database --sleep=1 --tries=3 --timeout=60"' ,
      cwd: '../manufacturing-laravel-backend',
      url: 'http://localhost:8000/up',
      reuseExistingServer: false,
      env: { APP_ENV: 'local', SESSION_DRIVER: 'file', CACHE_STORE: 'array', DEMO_MODE: 'true', QUEUE_CONNECTION: 'database' },
    },
    {
      command: 'pnpm dev --host localhost --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
    },
  ],
});
