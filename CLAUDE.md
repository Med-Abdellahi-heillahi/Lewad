# CLAUDE.md — Lewad Working Rules

**Read this file first, then read the `agent/` folder, before touching any code.**

## 1. Read the agent folder before working

Mandatory reading:

- [`agent/README.md`](./agent/README.md) — product direction, stack, what is off-limits
- [`agent/design-agent.md`](./agent/design-agent.md) — UI, responsive, tokens, RTL, a11y
- [`agent/security-agent.md`](./agent/security-agent.md) — keys, route protection, RLS boundaries
- [`agent/clean-code-agent.md`](./agent/clean-code-agent.md) — readability, reuse, TypeScript quality
- [`agent/clean-architecture-agent.md`](./agent/clean-architecture-agent.md) — layers, folders, backend seams

Task-specific briefs (read when the task matches):

- [`agent/admin-space-brief.md`](./agent/admin-space-brief.md) — admin & super-admin space structure
- Admin CRUD planning: [`users-agent.md`](./agent/users-agent.md),
  [`credits-agent.md`](./agent/credits-agent.md),
  [`search-agent.md`](./agent/search-agent.md),
  [`services-agent.md`](./agent/services-agent.md),
  [`categories-agent.md`](./agent/categories-agent.md), and
  [`requests-agent.md`](./agent/requests-agent.md). These are planning and
  safety contracts, not authority to implement privileged writes.

Pick the agent guidance that matches the task **before** modifying anything. If a
request conflicts with an agent's forbidden list, stop and ask rather than guess.

**Do not work randomly.** Survey the existing code first — this repository is
edited by several agents and by hand, so assume the code has moved since you last
saw it.

## 2. What Lewad is

A local search web app for Mauritania. The V1 loop:

`Search → Find → Contact / Go` · `Chercher → Trouver → Contacter / Aller` · `ابحث → اعثر → تواصل / اذهب`

## 3. Preserve the stack

React · TypeScript (strict) · Vite · Tailwind CSS v4 · Supabase

Do not change the framework, the bundler, or the styling system.

## 4. Preserve these behaviours

- FR / AR / EN, with Arabic in full RTL
- Dark and light mode
- Mobile-first UX
- Protected routes and their redirect rules
- Supabase Auth
- DB integration (profiles, wallets, credit ledger, establishments)

The i18n key contract is enforced by `Dictionary = typeof fr`: values may change
and keys may be added, but **never rename or remove a key**, and always add to
all three dictionaries at once.

## 5. Never do these without an explicit request

- Delete files or remove working code
- Expose secrets, or put a service-role key anywhere in `src/`
- Create Supabase tables, RLS policies, or SQL migrations
- Implement payments
- Mutate a wallet balance from the frontend
- Insert into the credit ledger from the frontend
- Change authentication behaviour
- Rewrite parts of the app the task did not ask about

Money and permissions are decided server-side. The client displays; it does not
decide.

## 6. Verify before reporting

```bash
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

Check the result in a browser when the change is visual: 390px and 1280px, light
and dark, FR and AR (RTL). Report what you actually checked — not what you assume
works.

## 7. Keep reports short

1. **Completed** — what changed
2. **Modified files** — list only
3. **Checks** — only those actually performed
4. **Not done** — what was deliberately left out, and the boundaries respected
5. **Risks / decisions needed** — anything the user must validate

No long audits. State failures plainly; do not claim a check you did not run.
