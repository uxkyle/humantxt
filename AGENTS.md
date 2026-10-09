## Repo

npm-workspaces monorepo. Node >= 22.12 (`nvm use`).

- `spec/human-txt-v0.1.md` — the spec. Format changes must update the spec, `packages/core/src/vocabulary.ts` and core tests together.
- `packages/core` — `@humantxt/core`, shared by the site and the extension. Exports TypeScript source directly (no build step).
- `packages/extension` — WXT, Manifest V3 for Chrome and Firefox. `npm run test:e2e` drives the built extension with Playwright against the built site's `/demo`.
- `apps/site` — Astro + one Preact island (`Editor.tsx`). Vercel Root Directory is `apps/site`.

## Commands

- `npm test` — core unit tests
- `npm run typecheck`
- `npm run test:e2e` — builds site + extension, runs Playwright
- `npm run dev` — site dev server. Astro's dev server runs in background mode; manage it with `npx astro dev stop|status|logs` from `apps/site`.

Astro docs: https://docs.astro.build
