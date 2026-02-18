## Plan: DRY React Components Refactor

Centralize the repeated client GraphQL POST helper, session (“Me”) fetching + `authTokenChanged` wiring, and the shared “entity detail” loading shell used by items/weapons/vehicles/cybernetics. Then standardize repeated page wrappers with a `PageShell`, and consolidate duplicated character constants. This keeps UX identical while reducing copy/paste and making future changes (auth, error handling, query shape) one-touch.

**Steps**
1. Create a single client GraphQL fetch utility in app/lib (replaces the copy/pasted `graphQLFetch` in [app/RequireAuth.tsx](app/RequireAuth.tsx), [app/SessionPanel.tsx](app/SessionPanel.tsx), [app/AuthPanel.tsx](app/AuthPanel.tsx), [app/PrivateCampaignsAndCharacters.tsx](app/PrivateCampaignsAndCharacters.tsx), [app/invite/InviteAcceptClient.tsx](app/invite/InviteAcceptClient.tsx), and entity clients like [app/items/[id]/itemPageClient.tsx](app/items/%5Bid%5D/itemPageClient.tsx)).
2. Add shared GraphQL query strings (at least `ME_QUERY`) in a small “queries” module, and update all components currently embedding `query Me { me { id email } }` (same set as above).
3. Build a `useMe()` hook (client-only) that:
   - Calls the shared fetcher + `ME_QUERY`
   - Exposes `{ me, loading, error, refresh }`
   - Subscribes to the `authTokenChanged` event so session refresh behavior is consistent across [app/SessionPanel.tsx](app/SessionPanel.tsx), [app/PrivateCampaignsAndCharacters.tsx](app/PrivateCampaignsAndCharacters.tsx), [app/invite/InviteAcceptClient.tsx](app/invite/InviteAcceptClient.tsx), etc.
4. Refactor auth-related components to use `useMe()`:
   - [app/RequireAuth.tsx](app/RequireAuth.tsx): replace bespoke “me loading + redirect” logic with the hook, preserving the exact redirect and loading behavior.
   - [app/SessionPanel.tsx](app/SessionPanel.tsx) and [app/AuthPanel.tsx](app/AuthPanel.tsx): simplify state/effects, keep abort/cancellation semantics intact where currently used.
5. Extract an entity-detail loading hook (or a small “loader” helper) that covers the shared pattern in:
   - [app/items/[id]/itemPageClient.tsx](app/items/%5Bid%5D/itemPageClient.tsx)
   - [app/weapons/[id]/weaponPageClient.tsx](app/weapons/%5Bid%5D/weaponPageClient.tsx)
   - [app/vehicles/[id]/vehiclePageClient.tsx](app/vehicles/%5Bid%5D/vehiclePageClient.tsx)
   - [app/cybernetics/[id]/cyberneticPageClient.tsx](app/cybernetics/%5Bid%5D/cyberneticPageClient.tsx)
   Keep per-entity rendering local, but share busy/error/not-found + “find by id” mechanics.
6. Add a `PageShell` component in app/ui and replace repeated wrapper markup in the server pages:
   - [app/items/[id]/page.tsx](app/items/%5Bid%5D/page.tsx), [app/weapons/[id]/page.tsx](app/weapons/%5Bid%5D/page.tsx), [app/vehicles/[id]/page.tsx](app/vehicles/%5Bid%5D/page.tsx), [app/cybernetics/[id]/page.tsx](app/cybernetics/%5Bid%5D/page.tsx)
   - Optionally also standardize [app/auth/page.tsx](app/auth/page.tsx) and/or other pages that duplicate the same shell layout, without changing content structure.
7. Normalize inline error rendering without UX change:
   - Introduce a tiny shared component (e.g., `InlineError`) that matches the existing crimson `<p>` usage, and replace repeated `<p style={{ color: 'crimson' }}>…</p>` patterns across the touched clients.
   - Leave [app/ui/notices.tsx](app/ui/notices.tsx) in place; optionally reuse it only where it already matches the current UX.
8. Consolidate duplicated character constants:
   - Move `PREDEFINED_SKILLS` into a shared module and import it from both [app/characters/[id]/CharacterPageClient.tsx](app/characters/%5Bid%5D/CharacterPageClient.tsx) and [app/characters/new/NewCharacterPageClient.tsx](app/characters/new/NewCharacterPageClient.tsx).
9. Keep server GraphQL calling separate:
   - Do not change [app/home/page.tsx](app/home/page.tsx) server-side Yoga usage except to optionally extract a server helper later; focus this pass on client-side dedupe.

**Verification**
- Run unit tests: `npm test` (or the repo’s configured Vitest command) and ensure snapshots/DOM assertions still match for layout-related tests under [src/app](src/app).
- Run e2e smoke: `npx playwright test` (at least auth + invite flows in [e2e](e2e)).
- Manual checks:
  - Login/logout updates session UI everywhere (panels + private dashboard).
  - Entity detail pages still show identical loading/error/not-found text and details.

**Decisions**
- Broad DRY pass (fetcher + hooks + page shell + character constants + consistent error display).
- Shared code lives under app/ (app/lib, app/ui).
- Keep separate server vs client GraphQL helpers for safety/clarity.
- Extract `PageShell` and replace repeated page wrappers.
