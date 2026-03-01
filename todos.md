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

- [x] Allow campaign OWNERs to create public archetypes (no-campaign, `isPublic=true`) with unit + E2E coverage

- [x] Add baseline global UI styling

- [x] Tune global UI to terminal look

- [x] Add terminal-style prompt prefixes

- [x] Style code blocks like terminal

- [x] Make UI borders angular

- [x] Add extra terminal UI polish

- [x] After each completed task, append Prompt/Response to prompts.md

- [x] Allow creating characters without campaign (dashboard + new character form)

- [x] Hide other users' campaign characters; label public as Archetype only

- [x] Allow editing characters from character detail page

- [x] Add failing backend tests for catalog entity CRUD + auth rules
- [x] Add failing Playwright test(s) for catalog create/edit/delete flows
- [x] Add ownership/campaign metadata and auth checks for catalog entities in Prisma + datasource
- [x] Add GraphQL catalog CRUD mutations and entity editability fields
- [x] Add UI pages/flows for creating and editing catalog entities
- [x] Run unit + e2e suites and fix regressions (new catalog spec + unit suite pass; full legacy e2e has unrelated existing failures)
- [x] Update todos and append this prompt/response log entry

- [x] Convert home catalog "New cybernetic/item/weapon/vehicle" controls to button actions like campaign/character
- [x] Update Vitest + Playwright coverage for button-based catalog creation navigation
- [x] Re-run unit and targeted E2E tests for the catalog creation controls

- [x] Add regression tests for NPC creation route navigation (Vitest + Playwright)
- [x] Fix New NPC navigation to use hard redirect and prevent client chunk-load transition failures
- [x] Re-run unit and targeted E2E tests for NPC route loading
- [x] Add failing Vitest + Playwright coverage for dashboard "View ..." navigation and per-entity list pages
- [x] Replace dashboard inline entity lists with "View ..." buttons for every entity type
- [x] Add dedicated list pages for campaigns, characters, cybernetics, weapons, items, and vehicles
- [x] Re-run targeted unit + E2E tests for dashboard/list-page flows
- [x] Append prompt/response summary entry for this task
- [x] Remove "View NPCs" button from the characters page
- [x] Append prompt/response summary entry for this update
- [x] Add failing Vitest + Playwright coverage for NPC dashboard action-row layout
- [x] Render dashboard NPC actions on one row (View NPCs + New NPC)
- [x] Re-run targeted unit + E2E tests for NPC action-row layout
- [x] Append prompt/response summary entry for this update
- [x] Add failing Vitest + Playwright assertions for NPC action order (New first, View second)
- [x] Reorder NPC dashboard actions to New NPC then View NPCs
- [x] Re-run targeted unit + E2E tests for NPC action order
- [x] Append prompt/response summary entry for this update
- [x] Add failing test coverage for required Next pages fallback files (_app/_document/_error)
- [x] Add minimal pages fallback files to prevent ENOENT on _document in dev
- [x] Re-run targeted unit + E2E checks for View NPCs navigation
- [x] Append prompt/response summary entry for this update
- [x] Add failing Vitest + Playwright coverage for hiding public NPCs from View Characters and renaming Archetype labels
- [x] Filter public NPCs out of View Characters page and rename visible Archetype labels to NPC
- [x] Re-run targeted unit + E2E tests for character/NPC listing behavior
- [x] Append prompt/response summary entry for this update
- [x] Add failing tests for custom checkbox styling/alignment in character creation UI
- [x] Implement non-generic custom checkbox styling and inline alignment consistent with custom selects
- [x] Re-run targeted unit + E2E tests for checkbox behavior/appearance expectations
- [x] Append prompt/response summary entry for this update
- [x] Add failing Vitest regression for RouteButton hard-navigation behavior
- [x] Update RouteButton to use full-page `window.location.assign` navigation
- [x] Re-run targeted Vitest + Playwright dashboard navigation tests
- [x] Add failing CSS regression test for textarea styling parity with terminal inputs
- [x] Style `textarea` controls in `globals.css` to match app input/select theme
- [x] Re-run targeted Vitest coverage for global control styling
