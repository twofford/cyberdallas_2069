# Todos

Append new todos to the bottom. When a todo is completed, check it off (do not reorder or delete old items).

- [x] Update schema + seed data (archetypes + membership)
- [x] Add failing membership tests
- [x] Implement membership in DataSource
- [x] Update Yoga schema/resolvers (membership filtering + joinCampaign)
- [x] Update UI + e2e expectations for no auto-join
- [x] Run unit + e2e suites
- [x] Run Prisma migration + seed

- [x] Add CampaignInvite model + migration (7-day expiry)
- [x] Add failing GraphQL invite tests (create/accept)
- [x] Implement invite persistence in DataSource (inMemory + Prisma)
- [x] Update Yoga schema/resolvers for invite flow (keep joinCampaign backdoor)
- [x] Run unit + e2e suites

- [x] Install Nodemailer and add SMTP config docs
- [x] Send invite email on createCampaignInvite (APP_BASE_URL + /invite landing)
- [x] Add /invite page to accept invite token
- [x] Run unit + e2e suites

- [x] Add campaign membership roles (OWNER/MEMBER) and migrate
- [x] Enforce owner-only invite creation (server-side)
- [x] Add tiny invite UI on homepage (owner-only)
- [x] Add Playwright coverage for invite UI (optional)

- [x] Send a real Gmail invite email end-to-end (create owner user → joinCampaign as OWNER → createCampaignInvite to taylor.wofford@gmail.com)
- [x] Ensure APP_BASE_URL matches the running dev port (3001) so invite links are correct
- [x] Add a documented one-liner (curl or Node script) to trigger a test invite email without using the UI

- [ ] Add /auth login page + redirect-to-dashboard flow
- [x] Add /auth login page + redirect-to-dashboard flow

- [x] Fix login/register forms sharing state

- [x] Ignore Next/test build artifacts in git

- [x] Add baseline global UI styling

- [x] Tune global UI to terminal look

- [x] Add terminal-style prompt prefixes

- [x] Style code blocks like terminal

- [x] Make UI borders angular

- [x] Add extra terminal UI polish

- [ ] After each completed task, append Prompt/Response to prompts.md
