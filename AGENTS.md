# PolicyLens

PolicyLens checks policy and procedure text for missing sections, review metadata, and draft-quality problems. The rules live in one package and are called from the web app, the MCP server, and the eval runner.

## Layout

- `packages/core` — rules engine. Pure TypeScript. No I/O.
- `apps/web` — Vite + React app. Static build, base path `/policylens/`.
- `packages/mcp-server` — stdio MCP server. Tools call the core engine.
- `evals` — 15 synthetic policies and a precision/recall runner.
- `apps/web/src/config.ts` — `STRIPE_PRO_PAYMENT_LINK`. Empty means the Pro button says “Coming soon”.

## Commands

```bash
npm install
npm run dev          # web app
npm test             # unit tests
npm run eval         # precision/recall on the synthetic policies
npm run lint
npm run typecheck
npm run build        # web dist and MCP bundle
```

Run one workspace with `npm test -w @policylens/core`.

## Rules engine

`analyzeDocument(text, options)` is the only entry point. Pass a template id (`healthcare`, `it-security`, `sop`) or a template object. Pass `referenceDate` in tests and evals so review age does not depend on the clock.

Heading match is exact after normalization (case, numbering, punctuation). A heading does not match a section just because it contains the word. Date fields are read from `Label: value` lines and simple tables. Numeric dates are month/day/year. A review is stale when the last-reviewed date is strictly older than the window; the anniversary day is still current. A next review date before the check date is the same check.

The score starts at 100: 40 sections, 30 metadata, 30 draft quality. Deductions are returned on the result. Do not hide a penalty or add one that is not in that list.

## Web app

Documents are extracted and checked in the browser. Do not add an upload endpoint. The optional model review is off until the user runs it, keeps the API key in session storage, and is not part of the QA score.

Free batch limit is 3 files. Named custom checklists and the organization line on reports require a local license key. The key format is checked in the browser only. Do not pretend it was verified with a server, and do not invent a Stripe checkout while `STRIPE_PRO_PAYMENT_LINK` is empty.

Copy on the site states what the software does. Do not add claims about users, customers, testimonials, revenue, or history.

## MCP

Build with `npm run build -w @policylens/mcp-server`, then run `node packages/mcp-server/dist/index.js`. Tools: `check_policy_document`, `list_templates`, `explain_finding`.

## Evals

Cases live in `evals/src/corpus.ts`. Each case lists the check ids that must be present and forbids every other check id. The runner exits non-zero on a mismatch. When you change a rule, update the corpus or the engine until precision and recall are honest, not by loosening the scorer.

## Tests

Core tests cover the score, the 12-month boundary, placeholders, acronyms, and dates. Add a core test when you change a rule. Keep fixtures generic: no real organisation names and no personal data.
