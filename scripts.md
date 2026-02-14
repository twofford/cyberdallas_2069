# Scripts

A small index of reusable scripts/one-liners for this repo.

## Send a real invite email (no UI)

Prereqs:
- `.env` has `AUTH_SECRET`, `APP_BASE_URL`, and SMTP variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, and if needed `SMTP_USER`/`SMTP_PASS`).
- `DISABLE_EMAIL` is not `"true"`.
- Dev server is running on the same port as `APP_BASE_URL`.

Run:
- Start server: `npm run dev -- -p 3001`
- Send invite: `npm run email:test-invite`

Optional env overrides:
- `INVITE_EMAIL="you@example.com"`
- `CAMPAIGN_ID="camp_2"`
- `GRAPHQL_URL="http://localhost:3001/api/graphql"`
- `OWNER_EMAIL="owner+123@example.com"`
- `OWNER_PASSWORD="password1234!"`

## Playwright E2E using Prisma/Postgres

Runs E2E against a dedicated DB (default `cyberdallas_e2e`), and resets+seeds it each time the Playwright dev server starts.

Run:
- `npm run test:e2e`

Optional env overrides:
- `DATABASE_URL_E2E="postgresql://postgres@localhost:5432/cyberdallas_e2e?schema=public"`
