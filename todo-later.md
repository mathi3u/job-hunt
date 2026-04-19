# Future Work

Items deferred from the initial release. Good candidates for GitHub issues.

## UX Improvements (Pipeline view)

- **Aging indicators on applied cards** — show "Applied Xd ago" badge with color shift (amber at 7 days, red at 14+) using `target_apply_date` or `updated_at`. Makes stale applications visible at a glance.
- **AddInterviewModal** — small calendar icon on applied-status cards opens a quick form to log interview date + type without opening the full detail drawer. Keeps the existing one-click "Interviewing" status flip for the no-date case.
- **Fix `closed_reason` persistence bug** — Pipeline.tsx close modal collects `closed_reason` via radio buttons but the `updateOpportunityStatus` hook never sends it to the DB. Column exists (`opportunities.closed_reason`), just needs wiring.
- **Extract `handleAddInterview` into a shared hook** — currently duplicated between `OpportunityDetail.tsx` and any future AddInterviewModal. Move to `src/hooks/useInterviewActions.ts`.

## Authentication

The app currently has no login — each self-hosted instance is one person's Supabase project. Adding multi-user auth (email/password or OAuth) would allow sharing a single deployment. Non-trivial: needs RLS policy updates to scope all data per user.

## Chrome Extension

- **Manifest v3** — already implemented (manifest_version: 3 is in place). No action needed.
- **Configurable host permissions** — currently the extension allows `*://*.vercel.app/*` and `*://*.netlify.app/*`. Consider making the custom domain configurable via options.

## Testing

No test harness exists. Candidates:
- **Unit tests (Vitest)**: `parseRelativeDate`, `recoverJson`, `usePipeline` hook mutations.
- **Integration tests**: Vercel function handlers with a test Supabase project.
- **E2E (Playwright)**: Full flow — extension capture → pipeline → mark applied → add interview.

## Other

- **Port API to edge runtime** — currently Node.js serverless functions. Edge runtime would reduce cold start latency but requires removing `@anthropic-ai/sdk` (use fetch-based API calls instead).
- **Vite config cleanup** — dead code block at bottom of `vite.config.ts` can be removed after the Vercel deploy smoke test passes.
- **Dashboard charts** — activity graph recalculates on every render; memoize with `useMemo`.
