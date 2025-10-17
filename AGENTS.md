# Repository Guidelines

## Project Structure & Module Organization

- TypeScript Cloudflare Worker for authorization holds.
- Source lives in `src/`:
  - `index.ts` entry.
  - `handlers/` request handlers (`*.handler.ts`).
  - `services/` external integrations (`*.service.ts`).
  - `middleware/` cross-cutting concerns (`cors.ts`, `auth.ts`, `rate-limit.ts`).
  - `lib/` errors, utils, router.
  - `config/` env validation and constants.
  - `types/` shared interfaces.
- Tests in `tests/unit` and `tests/integration`.
- Key config: `wrangler.toml`, `.env.example`, `vitest.config.ts`.

## Build, Test, and Development Commands

- `npm run dev` — run locally with Wrangler.
- `npm test` — run Vitest test suite.
- `npm test -- --coverage` — generate coverage report (`coverage/`).
- `npm run typecheck` — strict TypeScript type checks.
- `npm run lint` / `lint:fix` — ESLint checks and autofix.
- `npm run format` / `format:check` — Prettier formatting.
- `npm run deploy` — deploy to default environment.
- `npm run deploy:production` — deploy to production.
- `npm run tail` — stream Cloudflare Worker logs.
- First-time setup: `npm ci` (then hooks enabled via `npm run prepare`).

## Coding Style & Naming Conventions

- TypeScript (strict); 2-space indent, double quotes, semicolons.
- Formatting: Prettier enforced (`.prettierrc`). Use `npm run format`.
- Linting: ESLint with `@typescript-eslint` and `eslint-config-prettier`. Use `npm run lint`.
- Filenames: lower-kebab with role suffix when applicable, e.g., `holds.handler.ts`, `stripe.service.ts`, `rate-limit.ts`.
- Identifiers: functions `camelCase`; classes `PascalCase`; constants `UPPER_SNAKE_CASE`.
- EditorConfig is provided for editor defaults.

## Testing Guidelines

- Vitest (globals enabled, Node env). Place unit tests under `tests/unit`, integration under `tests/integration`.
- Name files `*.test.ts` (e.g., `tests/unit/utils.test.ts`).
- Coverage thresholds: 80% statements/branches/functions/lines. Use `npm test -- --coverage`.
- Keep tests deterministic; do not hit real Stripe/ChittyID—mock services.

## Commit & Pull Request Guidelines

- Conventional Commits enforced via commitlint/husky:
  - `feat: add capture idempotency key`
  - `fix: correct CORS wildcard handling`
  - `chore: update wrangler config`
- Pre-commit runs format and lint. Run before push: `npm run typecheck && npm test`.
- PRs include: description, linked issue(s), test updates, screenshots/logs when relevant, and notes on env/config changes.

## Security & Configuration Tips

- Never commit secrets. Copy `.env.example` to `.env` for local dev; use `wrangler secret put STRIPE_SECRET_KEY` (and related secrets) for Cloudflare.
- Never mint ChittyID locally; always call the ChittyID service (`src/services/chittyid.service.ts`).
- Validate env at startup; update CORS allowlist carefully; avoid logging PII or raw tokens.
