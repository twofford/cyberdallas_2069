import { defineConfig, devices } from '@playwright/test';

const port = 3002;
const e2eDatabaseUrl =
  process.env.DATABASE_URL_E2E ?? 'postgresql://postgres@localhost:5432/cyberdallas_e2e?schema=public';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 15_000,
  },
  retries: 0,
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run e2e:devserver`,
    url: `http://localhost:${port}`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      PORT: String(port),
      APP_BASE_URL: `http://localhost:${port}`,
      DATABASE_URL: e2eDatabaseUrl,
      CYBERDALLAS_DATA_SOURCE: 'prisma',
      AUTH_SECRET: process.env.AUTH_SECRET ?? 'e2e-secret',
      DISABLE_EMAIL: 'true',
      PASSWORD_SCRYPT_N: '256',
      PASSWORD_SCRYPT_R: '8',
      PASSWORD_SCRYPT_P: '1',
    },
  },
});
