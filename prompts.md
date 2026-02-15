# Prompt and Response Log

- Prompt: Recommend a tech stack for a cyberpunk TTRPG web app; constraints: everything in TypeScript and must use GraphQL.
- Response: Proposed a Next.js + TypeScript app with a GraphQL API (Yoga/Apollo), typed schema + codegen, Postgres + Prisma, plus testing/linting and deployment options aligned with an all-TS codebase.

- Prompt: Propose concrete package choices.
- Response: Listed an opinionated set of npm packages for Next.js + GraphQL Yoga + Prisma + graphql-codegen + urql, with alternatives (Apollo Server/Client, Pothos/Nexus) and testing/lint/styling packages.

- Prompt: Live updates are preferable.
- Response: Recommended GraphQL Yoga + `graphql-ws` subscriptions (or SSE as fallback) and noted that true WebSockets require a Node server deployment (often easiest as a separate API service), with matching client packages for subscription support.

- Prompt: Don’t use WebSockets; use the other way for live updates.
- Response: Switched the live-update plan to GraphQL-over-SSE using `graphql-sse`, removing `graphql-ws` and keeping standard HTTP for queries/mutations.

- Prompt: No live updates; use a regular old web server.
- Response: Simplified to plain HTTP GraphQL (no subscriptions) with a Node server (Fastify + GraphQL Yoga) plus Next.js frontend, Prisma/Postgres, and graphql-codegen for end-to-end TypeScript types.

- Prompt: Go with a single deployable.
- Response: Finalized on a single Next.js app that serves the UI and hosts GraphQL Yoga at an `/api/graphql` route (HTTP only), using Prisma/Postgres and graphql-codegen for end-to-end TypeScript typing.

- Prompt: Yes—scaffold the Next.js + Yoga route and a minimal schema, writing failing tests first.
- Response: Planned and began scaffolding a single Next.js TypeScript app with Vitest; next steps are to add a failing GraphQL test, implement the Yoga schema + `/api/graphql` route, and run tests to confirm passing.

- Prompt: The test wasn’t failing for the reason stated; it failed because the imported module couldn’t be found.
- Response: Acknowledged the mismatch: the initial failure was due to missing `src/graphql/yoga.ts` (module resolution), not schema behavior; confirmed it’s now resolved since the module exists and tests pass.

- Prompt: Add comments above imports when the module/package hasn’t been installed/created yet, to signal that interim import-resolution failures are expected.
- Response: Added this as a standing instruction in context.md; going forward I’ll annotate such imports with `// TODO: npm i <pkg>` or `// TODO: create <path>`.

- Prompt: Add the comment for the import-resolution failure in yoga.test.ts.
- Response: Added a `// TODO: create src/graphql/yoga.ts` comment immediately above the `./yoga` import in yoga.test.ts.

- Prompt: Add the next tests+implementation for a slightly richer schema matching rules (stats, skills, cybernetics, weapons, vehicles), kept minimal.
- Response: Added a failing test querying those fields, confirmed it failed with GraphQL validation errors, then expanded the Yoga schema/resolvers + seed data to support them and re-ran tests to green.

- Prompt: Step back and align the GraphQL schema to new data models (Campaign, User, Character, Cybernetic, Weapon, Item, Vehicle) and clarify whether join tables are still needed.
- Response: Updated tests and schema (tests-first) to add Campaign↔Character relationship, rename Character movement field, and expand Cybernetic/Weapon/Item/Vehicle types with the specified fields and browseable catalog queries; noted that GraphQL doesn’t remove the need for join tables in a relational DB (it just hides them behind nested resolvers).

- Prompt: Change movement back to speed on characters, remove unused types from yoga.ts, and remove seed data from yoga.ts unless needed for tests.
- Response: Renamed `movement` back to `speed` in the schema and tests, moved test/dev seed data into `src/graphql/seed.ts`, and trimmed yoga.ts down to schema+resolvers with only necessary imported types; tests still pass.

- Prompt: What would your next step be?
- Response: Recommended moving from in-memory seed data to a real persistence layer (Prisma + DB) and adding auth foundations (User model with unique/validated email and hashed passwords), while keeping the GraphQL schema stable and tests-first.

- Prompt: Let’s go with Postgres.
- Response: Added Prisma + a Postgres schema (including join tables), created a datasource abstraction that defaults to in-memory when `DATABASE_URL` is unset and uses Prisma when set, refactored GraphQL resolvers to read via the datasource, and kept tests green.

- Prompt: Postgres is running; go ahead and create the database and run whatever commands you wish.
- Response: Created a local `.env` with `DATABASE_URL`, connected via `psql`, created the `cyberdallas` database, ran `prisma migrate dev --name init`, generated Prisma Client, and verified tables exist.

- Prompt: Go ahead.
- Response: Added a Prisma seed script (`prisma/seed.ts`), ran `npm run db:seed` to populate Postgres, and added a `CYBERDALLAS_DATA_SOURCE` override so unit tests always use in-memory data even when `DATABASE_URL` is present.

- Prompt: Very good. What would your next step be?
- Response: Recommended (1) moving Prisma config out of package.json into `prisma.config.ts` (Prisma 7 compatibility), then (2) implementing User auth (register/login) with email validation + password hashing, and (3) adding DB-backed integration tests for the Prisma datasource/GraphQL resolvers.

- Context Window (2026-02-13 00:57): New context window started.

- Prompt (2026-02-13 00:57): "Read context.md and continue your work." / "You are stuck."
- Response: Read project constraints (test-first, log to prompts.md, never edit rules.md), added a failing HomePage test, implemented an async GraphQL-backed HomePage that lists campaigns/characters/catalogs, fixed Vitest failing due to `@/*` path alias by adding a `resolve.alias` mapping in vitest config, and re-ran unit tests to green.

- Prompt (2026-02-13 00:59): "Before you do that, you wrote the most recent prompt/response to the top of prompts.md. Each new entry should be appended to the bottom. Please fix this."
- Response: Moved the latest entry from the top of prompts.md to the bottom to preserve append-only chronological order, and recorded this correction as a new appended log entry.

- Prompt (2026-02-13 01:00): "I see it. However, you did not indicate that we entered a new context window in your log. Fix this."
- Response: Added an explicit "Context Window" marker in prompts.md at the start of this session (00:57) and appended this entry to record the correction.

- Prompt (2026-02-13 01:06): "It's 3001, but that's fine. Let's move on to auth."
- Response: Added tests-first GraphQL auth coverage (`register`, `login`, `me`), implemented password hashing (scrypt) and HMAC-signed bearer tokens, extended the datasource to create/find/get users for both in-memory and Prisma modes, repaired a corrupted schema patch in yoga.ts, disabled Yoga error masking so tests can assert on error messages, and re-ran `npm test` to green.

- Prompt (2026-02-13 01:08): "Yes, let's do that."
- Response: Added a failing HomePage UI test expecting a minimal auth section, implemented a client-side AuthPanel with Register/Login forms that call `/api/graphql`, store the returned token in `localStorage`, and display the current user via `me`, wired it into the homepage, and re-ran `npm test` to green.

- Prompt (2026-02-13 01:10): "Yes, add Playwright."
- Response: Installed Playwright, added a Playwright config that runs Next dev on a dedicated port with in-memory datasource + fixed AUTH_SECRET, wrote E2E browser tests for auth (register persists across reload; invalid login shows error), and ran `npm run test:e2e` successfully.

- Prompt (2026-02-13): "Wait. There is a problem with the registration flow. When I attempt to register a user via the UI, I get this error: Server misconfigured: AUTH_SECRET is missing. Explain what's wrong and how you plan to fix it."
- Response: Explained that `register`/`login` issue signed tokens and require `AUTH_SECRET`; unit tests and Playwright set a default secret, but local `npm run dev` uses `.env` which didn’t include `AUTH_SECRET`. Fixed by adding a dev `AUTH_SECRET` to `.env` and documenting how to set it in `.env.example`.

- Prompt (2026-02-13): Confirmed to proceed with implementing sign-out, and requested an update to context.md so future prompt summaries describe the actual task/intent even when the prompt is brief.
- Response: Added a failing Playwright test for signing out, implemented a minimal “Sign out” button that clears `localStorage` and resets auth state, updated context.md with the new prompt-summary requirement, and re-ran unit + e2e tests to green.

- Prompt (2026-02-13): Asked whether I was stuck due to lack of visible progress.
- Response: Clarified I wasn’t stuck, then continued implementing the logout UI + reran tests.

- Prompt (2026-02-13): Approved adding auth-gating for GraphQL queries and requested that “are you stuck?” prompts no longer be appended to prompts.md.
- Response: Implemented auth-required access for `campaigns`/`characters`, refactored HomePage to fetch private lists client-side using the bearer token, updated unit + e2e tests accordingly, and updated context.md to omit logging for “are you stuck?” meta prompts going forward.

- Prompt (2026-02-13): Approved implementing token expiry and an “expired session” UX path.
- Response: Added expiring auth tokens (default TTL 7 days) with unit tests, updated token issuance/verification to enforce `exp`, and updated AuthPanel to clear invalid/expired sessions and show “Session expired. Please sign in again.”; unit + e2e tests pass.

- Prompt (2026-02-13): Approved fixing the recurring warnings from unit/e2e runs (duplicate Playwright dependency and Next.js workspace-root inference warning).
- Response: Removed the duplicate `@playwright/test` entry from package.json and set `outputFileTracingRoot` in next.config.ts to the repo root; re-ran unit + e2e suites successfully.

- Prompt (2026-02-13 02:06): "Okay, do it … PCs unique to a campaign but generic NPC archetypes visible to any logged-in user" (no auto-join; `campaigns` lists only member campaigns; archetypes are public Characters with no campaign).
- Response: Implemented campaign membership authorization + public archetypes: added `CampaignMembership` to Prisma, made `Character.campaignId` nullable and added `Character.isPublic`, implemented `joinCampaign(campaignId)` mutation, updated `campaigns`/`characters` queries to filter by membership while still returning public archetypes, updated UI rendering for nullable character campaigns, updated Playwright E2E expectations (no auto-join), and ran `npm test` + `npm run test:e2e` to green.

- Prompt (2026-02-13 02:11): "Create a todos.md at the root and add your todos to it; check them off when complete; append new ones to the bottom."
- Response: Created todos.md at the repo root with the current completed work checked off, updated context.md to make todos.md the persistent append-only todo list going forward, and added todos.md to the reference documents list.

- Prompt (2026-02-13 02:16): "Campaigns will be joined by email invite; keep joinCampaign as a backdoor; invites expire after 7 days."
- Response: Added an invite-based membership flow: created `CampaignInvite` Prisma model + migration, added GraphQL mutations `createCampaignInvite` (member-only) and `acceptCampaignInvite` (requires signed-in user, email must match invite, and invite expires after 7 days), implemented in-memory + Prisma datasource support, added tests asserting the 7-day expiry window and email-mismatch rejection, and re-ran `npm test` + `npm run test:e2e` to green.

- Prompt (2026-02-13 02:23): "Add the ability to actually send an email with an invite link" / "Let’s go with SMTP (Nodemailer)".
- Response: Installed Nodemailer and added SMTP configuration docs to `.env.example`, updated `createCampaignInvite` to email an invite link built from `APP_BASE_URL` pointing to `/invite?token=...`, and added a minimal `/invite` page that lets a signed-in user accept the invite via `acceptCampaignInvite`; unit tests keep email sending disabled under `NODE_ENV=test`, and `npm test` + `npm run test:e2e` pass.

- Prompt (2026-02-13): "Yes, do that." (add optional Playwright coverage for invite UI)
- Response: Added Playwright tests verifying the invite form is visible only to campaign owners and hidden for non-owner members, using the `joinCampaign` backdoor via direct POSTs to `/api/graphql` with the bearer token; fixed a selector to avoid exact text matching because the invite form renders inside the same `<li>`; verified with `npm run test:e2e`.

- Prompt (2026-02-13): "Sure, go for it." (add E2E test that clicks “Send invite” and asserts success)
- Response: Fixed the homepage GraphQL helper to include `variables` in requests so `createCampaignInvite` works; made SMTP sending a no-op when `CYBERDALLAS_DATA_SOURCE=inMemory` so Playwright doesn’t require SMTP config; extended the Playwright owner invite UI test to submit an invite and assert “Invite sent.”.

- Prompt (2026-02-13): "You wrote to prompts.md at the top of the file. You should never do that… Add that instruction to context.md."
- Response: Moved the two most recent log entries from the top of `prompts.md` to the bottom to restore append-only ordering, and updated `context.md` with an explicit rule to always append new prompts.md entries to the bottom.

- Prompt (2026-02-13): "Okay. Now I want to test sending a real email. You can use my email address, taylor.wofford@gmail.com."
- Response: Adjusted email sending to be controlled by an explicit `DISABLE_EMAIL=true` env flag (instead of implicitly disabling when `CYBERDALLAS_DATA_SOURCE=inMemory`), set `DISABLE_EMAIL=true` in Playwright’s dev server env so E2E remains hermetic, re-ran unit + E2E suites to confirm green, and provided steps to configure SMTP env vars and trigger `createCampaignInvite` to send a real email.

- Prompt (2026-02-13): "Yes, do that, and add these variables to .env."
- Response: Updated `.env.example` with a Gmail SMTP dev configuration block (commented, with guidance to use a Google App Password) and documented `DISABLE_EMAIL`; updated local `.env` to include `APP_BASE_URL` and Gmail SMTP variables using a safe placeholder for `SMTP_PASS`.

- Context Window (2026-02-13 15:34 UTC): New context window started.

- Prompt (2026-02-13 15:34 UTC): "Read context.md and continue your work." (Continue from current repo state.)
- Response: Read `context.md`/`rules.md`/`todos.md` and identified the remaining work: verify `APP_BASE_URL` for correct invite links on the dev port and add a documented one-liner/script to send a real invite email end-to-end without using the UI.

- Prompt (2026-02-13 15:37 UTC): (Continuation of the same request.)
- Response: Updated local `.env` so `APP_BASE_URL` is `http://localhost:3001`, documented it in `.env.example`, added a tests-first Node script (`npm run email:test-invite`) to register/login, `joinCampaign` as OWNER, and call `createCampaignInvite`, then ran it against a dev server on port 3001 to send a real Gmail invite email.

- Prompt (2026-02-13 22:23 UTC): Reported invite accept UX bug: after successfully accepting an invite, the “Accept invite” button remains visible and a second click errors with “Invite has already been used”; requested the button be hidden after success.
- Response: Added a failing Playwright test asserting the accept button disappears after a successful accept, then updated the invite page client to latch an “accepted” state and hide the button once accepted; re-ran unit tests and Playwright to green.

- Prompt (2026-02-13 22:28 UTC): Requested sending another real invite email to validate the flow again; also requested a reusable scripts index (scripts.md) referenced from context.md.
- Response: Added scripts.md at repo root and referenced it from context.md; re-ran Prisma seed to ensure camp_2 exists in the DB, then ran the no-UI script to create and email a fresh invite to taylor.wofford@gmail.com.

- Prompt (2026-02-13 22:29 UTC): Confirmed the fix worked: after accepting an invite, the “Accept invite” button disappears.
- Response: Acknowledged validation and stopped the dev server used for monitoring.

- Prompt (2026-02-13 22:33 UTC): Noted prompts.md ordering bug: the most recent entry was not the last one in the file.
- Response: Moved the misplaced 15:37 UTC entry to its correct chronological position after 15:34 UTC so the newest 22:29 UTC entry is at the bottom.

- Prompt (2026-02-13 22:37 UTC): "Let's move the invite process fully over to Prisma/Postgres".
- Response: Switched Playwright E2E to run the app in Prisma datasource mode against a dedicated Postgres database (`cyberdallas_e2e`) that is reset+seeded on startup; added a third seeded campaign to avoid OWNER-role cross-test interference; updated E2E tests accordingly; verified `npm run test:e2e` and `npm test` pass.

- Prompt (2026-02-13 22:39 UTC): Asked what remaining work is needed for auth.
- Response: Outlined the main remaining auth tasks (session storage hardening, password reset/email verification, rate limiting/brute-force protection, and token revocation/rotation), prioritized for security and UX.

- Prompt (2026-02-13 22:51 UTC): Proceed with auth hardening: migrate from localStorage bearer tokens to HttpOnly cookie-based sessions, and refactor UI + Playwright E2E to rely on cookies.
- Response: Implemented cookie session support in the GraphQL Yoga server (HttpOnly `Set-Cookie` on register/login, `logout` mutation clears cookie, cookie parsing for auth with bearer fallback); refactored the Next.js client components to stop using localStorage/Authorization headers and call `logout` on sign-out; updated Playwright E2E tests to stop reading localStorage tokens and stop sending Bearer headers; set Playwright webServer to not reuse an existing server so the E2E database reset+seed runs deterministically; verified `npm test` and `npm run test:e2e` pass.

- Prompt (2026-02-13 23:03 UTC): Implement CSRF origin-check and remove bearer fallback.
- Response: Added a same-origin CSRF check for GraphQL mutation POSTs (Origin/Referer must match the request origin or `APP_BASE_URL` origin); removed the `Authorization: Bearer ...` fallback so auth is cookie-only; updated unit tests and the `email:test-invite` script (and its tests) to authenticate via the session cookie and include Origin headers; verified `npm test` and `npm run test:e2e` pass.

- Context Window (2026-02-13 23:17 UTC): New context window started.

- Prompt (2026-02-13 23:17 UTC): Remove auth tokens from GraphQL `register`/`login` responses (stop returning `token`) and update any callers/tests.
- Response: Updated the GraphQL schema so `AuthPayload` returns only `user` (session is still established via HttpOnly cookie); refactored UI, E2E, scripts, and unit tests to stop querying/expecting `token`; fixed remaining unit tests to include required Origin headers for mutation CSRF checks; verified `npm test` and `npm run test:e2e` pass.

- Prompt (2026-02-13 23:17 UTC): “Yes” (proceed with a repo-wide sweep for any remaining token-return references).
- Response: Scanned the repo for lingering `register/login { token }` selections and `.register.token`/`.login.token` usages; no remaining references found outside build artifacts, and docs mentioning “token” are limited to historical prompt logs.

- Prompt (2026-02-13 23:18 UTC): What else remains to be done with auth?
- Response: Reviewed current auth posture (HttpOnly cookie sessions, cookie-only auth, same-origin CSRF checks for mutation POSTs, no token returned from register/login) and outlined the next highest-value security/UX items: server-side session storage + revocation, rate limiting/brute-force protection, account lifecycle flows (email verification/password reset), and optional MFA/audit logging.

- Prompt (2026-02-14 03:26 UTC): Reported bug: typing into Login or Register form mirrors into the other form; the two forms appear to share state.
- Response: Added a failing Playwright regression test proving the Register/Login inputs mirrored each other, split `AuthPanel` state into separate login vs register email/password state, re-ran the targeted Playwright test to confirm it passes, and ran the Vitest unit suite to ensure no regressions.

- Prompt (2026-02-14 03:34 UTC): Repo hygiene: lots of generated files (.gz, webpack/Next build artifacts) are showing as changed; update .gitignore so only meaningful changes are tracked.
- Response: Expanded `.gitignore` to ignore Next.js build output (`.next/`), caches, test artifacts (Playwright/Vitest), logs, and local `.env*` files (keeping `.env.example` trackable). Removed the already-tracked `.next` directory from git’s index via `git rm -r --cached .next` so it stops showing up in future diffs.

- Prompt (2026-02-14 03:40 UTC): Next.js dev runtime error when loading `localhost:3001` (`Cannot read properties of undefined (reading 'call')` in `.next/server/app/auth/page.js`).
- Response: Diagnosed as a stale/corrupted Next build artifact issue (stack trace points into generated `.next` server bundle). Fixed by stopping the dev server, deleting `.next` to force a clean rebuild, and restarting Next on port 3001; verified `/auth` returns 200 without page runtime errors via a headless Playwright smoke load.

- Prompt (2026-02-14 03:44 UTC): Improve the look of the UI; current UI is a simple white page with black text.
- Response: Added a minimal global stylesheet and a stable styling hook on the root layout (`data-ui="cyberdallas"`) so pages render with improved spacing, typography, and form/button styling. Styling uses CSS system colors (no custom palette), and a small unit test was added to lock in the layout hook; `npm test` remains green.

- Prompt (2026-02-14 03:45 UTC): UI direction: "Clean terminal".
- Response: Updated the global stylesheet to a clean terminal aesthetic (monospace system font stack, tighter layout, minimal bordered panels/controls, focus outlines) while still relying on CSS system color keywords (no hard-coded palette). Verified unit tests remain green.

- Prompt (2026-02-14 03:46 UTC): Confirmed to proceed with making headings and lists feel more like terminal output.
- Response: Implemented prompt-like prefixes using CSS pseudo-elements (e.g. `$ ` for the main heading and `> ` for section headings; `-` for list items) in the global stylesheet without changing the underlying text content. Added a small unit test that asserts these selectors exist; `npm test` remains green.

- Prompt (2026-02-14 03:48 UTC): Confirmed to proceed with making code/inline elements look more like terminal blocks.
- Response: Added terminal-style formatting for inline `code` and `pre` blocks in the global stylesheet using only system colors (subtle panel background + border), and added a small unit test asserting the relevant selectors exist; `npm test` remains green.

- Prompt (2026-02-14 03:49 UTC): UI feedback: remove rounded borders; make them angular.
- Response: Updated global terminal styles to use angular corners by setting border radii to `0` for panels, inputs, buttons, and code/pre blocks; verified `npm test` remains green.

- Prompt (2026-02-14 03:55 UTC): Go further: make the UI look even more like a terminal (CSS-only, no new pages/components).
- Response: Added additional terminal polish in the global stylesheet: system-color selection styling, a subtle terminal grid background (system-color based), bracketed buttons via pseudo-elements, and section header divider lines. Updated CSS unit tests to lock in these selectors and verified `npm test` remains green.

- Prompt (2026-02-14 03:55 UTC): Asked why there is a weird grid on the page.
- Response: Explained it’s an intentional “terminal grid” background coming from the global CSS (`background-image` linear-gradients) added as terminal polish; offered to remove it or gate it behind a preference/toggle.

- Prompt (2026-02-14 04:15 UTC): Asked to add an E2E cleanup script because Playwright specs were slow/timeouting.
- Response: Added an `e2e:kill` script that terminates orphaned E2E processes (port 3002 listeners and lingering Playwright test-server/e2eDevServer), and updated `test:e2e` to run the cleanup before executing Playwright.

- Prompt (2026-02-14 04:22 UTC): Asked to add dashboard links so clicking a character navigates to a stats page.
- Response: Added a character detail route (`/characters/[id]`) that loads character stats via GraphQL and requires auth. Updated the dashboard character list to render character names as links to the new route. Added a Playwright test that clicks a character link and asserts the stats view renders.

- Prompt (2026-02-14 04:24 UTC): Asked to ensure the character page shows all character info, not just stats (skills, cybernetics, items, weapons, vehicles).
- Response: Expanded the character detail GraphQL query and UI to render sections for Skills, Cybernetics, Weapons, Items, and Vehicles (with "None." empty states when a character has none). Updated the Playwright character navigation test to assert these sections render.

- Prompt (2026-02-14 05:54 UTC): Debug why `npm run test:e2e` is running incredibly slowly, and do not attempt to run it again until investigated.
- Response: Found orphaned Playwright/Next E2E devserver processes still listening on port 3002 after an interrupted run (making subsequent runs appear hung). Killed the lingering processes, instrumented `src/scripts/e2eDevServer.ts` with step timing logs, switched Prisma/Next invocations to `npx --no-install` to avoid implicit downloads, skipped Prisma client generation during `migrate reset`, and added a clearer Playwright `webServer.timeout`.

- Prompt (2026-02-14 06:15 UTC): Run E2E after debugging, then fix any issues discovered.
- Response: Ran Playwright and found Next 15 runtime errors requiring `await cookies()` in server components, then fixed [app/page.tsx](app/page.tsx) and [app/auth/page.tsx](app/auth/page.tsx) and updated unit mocks. Investigated remaining E2E auth failures with Playwright debug logs and found the Login/Register forms could submit natively before React hydration (navigating to `/auth?`), so I disabled auth submit buttons until hydration in [app/AuthPanel.tsx](app/AuthPanel.tsx) and updated [e2e/auth.spec.ts](e2e/auth.spec.ts) to wait for buttons to be enabled before clicking. E2E suite is now passing.

- Prompt (2026-02-14): Auth UX: “I don’t want both login and register forms on the same page.”
- Response: Refactored `/auth` to a single-form UX with a mode toggle (default Login) and “Switch to register/login” affordance; added stable `aria-label`s and hydration markers (`data-auth-hydrated`, `data-auth-mode`) to reduce Playwright flakiness.

- Prompt (2026-02-14): UI feedback: remove the weird grid background.
- Response: Removed the terminal grid background from global styles while keeping the rest of the terminal aesthetic; updated the related unit tests to reflect the new selectors.

- Prompt (2026-02-14): Add catalog detail pages for Cybernetics/Weapons/Items/Vehicles and link to them from the dashboard.
- Response: Implemented detail routes for each catalog type, wired the dashboard lists to link to them, and added/updated Playwright coverage to ensure the links navigate and the detail pages render.

- Prompt (2026-02-14): Add the ability for users to create new characters.
- Response: Implemented a `createCharacter` GraphQL mutation with datasource support, added a minimal character-creation UI, and added unit + Playwright tests for the end-to-end creation flow.

- Prompt (2026-02-14): UX change: don’t show the create-character form inline on the dashboard; make it a button that goes to a dedicated new page.
- Response: Removed the inline dashboard creation form, added a “New character” button that routes to `/characters/new`, created the dedicated page, and updated E2E to use the new flow.

- Prompt (2026-02-14): Expand character creation so users can set stats, skills, and loadout (cybernetics/items/weapons/vehicles) at creation time.
- Response: Extended `createCharacter` input + validation + persistence (Prisma + in-memory) to accept stats/skills/gear IDs; updated the `/characters/new` UI to collect these values and submit them; updated unit + Playwright coverage.

- Prompt (2026-02-14): Skills must match the predefined list in rules.md.
- Response: Aligned the predefined skill list to rules.md in the GraphQL layer and UI; canonicalized skill names case-insensitively for predefined skills while still allowing custom skill names.

- Prompt (2026-02-14): Skills UX: instead of dropdowns, list each skill with a numeric input like stats.
- Response: Replaced the skills dropdown UX with a full predefined skills grid of numeric inputs (0–10) to match the stats entry pattern.

- Prompt (2026-02-14): Add user-defined custom skills (up to 5): name + value.
- Response: Added an “Add new skill” flow that creates up to 5 custom skill rows (name + level) and includes them in the submitted `createCharacter` payload.

- Prompt (2026-02-14): Add a “Save” button on each custom skill row that promotes it into the main skills list and clears/removes the custom input.
- Response: Implemented per-row Save that canonicalizes predefined matches, de-dupes case-insensitively, adds the saved skill into the main skills grid, sets its numeric value, and removes the custom row; verified with unit + Playwright.

- Prompt (2026-02-14): “Let’s also add a way to remove custom skills from the main skill grid.”
- Response: Added a per-skill “Remove” button for saved custom skills (predefined skills are not removable) and verified with `npm test` + `npm run test:e2e`.

- Prompt (2026-02-14): Before adding more tests: prompts.md is missing appended prompt/response entries.
- Response: Identified the last logged entry in prompts.md, restored chronological ordering for the out-of-order 05:54/06:15 entries, and appended all missing prompt/response summaries since then to the bottom of the file.

- Prompt (2026-02-14): The custom-skill remove control is throwing off the CSS; replace the Remove button with a corner “X” overlay and keep skill inputs full-width.
- Response: Replaced the layout-affecting Remove button with an absolutely-positioned “×” icon over the custom skill input, ensured the nested input stays `width: 100%` so all skill inputs span the full column, and adjusted the icon-button CSS to disable the bracket pseudo-elements and render as a subtle corner control; `npm test` remains green.

- Prompt (2026-02-14): Duplicate skills are invalid state; add reusable frontend error scaffolding and communicate duplicate-skill errors to the user.
- Response: Added a reusable notices scaffold (`useNotices` + `Notices`) and integrated it into character creation. The UI now blocks saving or submitting duplicate skills (including custom vs predefined/saved/custom duplicates) and shows clear error messages instead of silently overriding levels. Verified with `npm test` and `npm run test:e2e`.

- Prompt (2026-02-14): Error messages are appearing at the top of the page while the user is scrolled down; show invalid-state errors where the user is interacting (a tooltip would work).
- Response: Added a reusable `TooltipNotice` component and switched duplicate-skill validation feedback to action-local tooltips: clicking Save shows the error next to that Save button, and clicking Create shows the error next to the Create button. Kept the top notices for general load errors; `npm test` and `npm run test:e2e` pass.

- Prompt (2026-02-14): Move the invalid-action tooltip to the right of the Save button (not above it).
- Response: Updated `TooltipNotice` positioning so it renders to the right of the anchored button (vertically centered) instead of above, improving visibility while the user is focused on the Save/Create actions; `npm test` remains green.

- Prompt (2026-02-14): The tooltip is taller than surrounding elements; make it the same size.
- Response: Updated `TooltipNotice` to render as a single-line pill with the same padding/font sizing as our inputs/buttons and with ellipsis truncation (no multi-line wrapping), so its height matches adjacent controls; `npm test` remains green.

- Prompt (2026-02-14): The tooltip exceeds the width of the section; it should never overflow the form container.
- Response: Refactored `TooltipNotice` to render as an inline pill and placed it as a flex sibling to the right of the Save/Create buttons. This keeps the tooltip constrained by the section width (with ellipsis truncation) while still appearing where the invalid action occurs; `npm test` and `npm run test:e2e` pass.

- Prompt (2026-02-14): The Save button is scrunched and the tooltip is truncating useful info; widen the section/form and ensure everything fits nicely.
- Response: Widened the main content container (`main` max-width) so the form section has more horizontal space, and adjusted the Save/Create + tooltip flex layout so buttons keep their natural width and tooltip text wraps instead of truncating. Verified with `npm test` and `npm run test:e2e`.

- Prompt (2026-02-14): The Stats and Skills sections are too close to the preceding controls; add more padding/spacing up top.
- Response: Increased top spacing above the Stats and Skills section headings on the character creation form so they have clearer separation from the preceding fields; `npm test` remains green.

- Prompt (2026-02-14): The campaign select dropdown doesn’t match the app style (generic font/light colors); make it look like the rest of the text.
- Response: Added global `select` styling under the cyberdallas theme so dropdowns inherit the monospace font and use Canvas/CanvasText colors, matching inputs/buttons and the rest of the terminal UI; `npm test` remains green.

- Prompt (2026-02-14): The opened dropdown list still shows a generic gray background and default font; change that too.
- Response: Added theme styling for `option`/`optgroup` and set `color-scheme: dark` on `select` to encourage the native dropdown list to render with dark Canvas/CanvasText and inherited font where the browser allows; `npm test` remains green.

- Prompt (2026-02-14): Let’s do the custom select, then.
- Response: Implemented a custom Campaign select ([app/ui/Select.tsx](app/ui/Select.tsx)) so the opened dropdown list can be fully styled to match the terminal theme on macOS. Wired it into the character creation form, added global theme CSS for the select trigger/listbox/options, updated Playwright E2E to click the desired campaign option, and verified `npm test` + `npm run test:e2e` pass.
