# Lewad — Codex Working System

## Mandatory start

Before every task, read this file, then [`CLAUDE.md`](./CLAUDE.md),
[`agent/README.md`](./agent/README.md), and every agent file relevant to the
area being changed. Never skip an agent rule. Survey the current code before
editing: this repository is worked on by people and multiple agents.

For an admin CRUD phase, also read `agent/admin-space-brief.md`, the applicable
area agent below, `security-agent.md`, `design-agent.md`,
`clean-code-agent.md`, and `clean-architecture-agent.md`.

## Non-negotiable boundaries

- Keep Lewad V1 focused. Make the smallest change that fully satisfies the task.
- Preserve React, TypeScript, Vite, Tailwind, and the existing Supabase client.
- Preserve FR, AR, EN, Arabic RTL, mobile-first layouts, and dark/light mode.
- Do not touch Supabase tables, migrations, RLS, RPCs, wallet, ledger, payment,
  credit-debit, or role logic unless the request explicitly authorises it.
- Never expose, print, log, or commit a service-role key or any secret.
- Never delete files unless explicitly instructed.
- Keep components, hooks, and data access in their established layers; do not
  put Supabase calls or security decisions in UI components.
- Use clean code and clean architecture guidance. Do not silence type errors.
- Reports stay short and useful: completed work, files, checks actually run,
  and deliberate boundaries.

## Available agents

| Agent | File | Use it for |
|---|---|---|
| users-agent | [`agent/users-agent.md`](./agent/users-agent.md) | Admin planning for profiles and users |
| credits-agent | [`agent/credits-agent.md`](./agent/credits-agent.md) | Wallet, ledger, and recharge planning |
| search-agent | [`agent/search-agent.md`](./agent/search-agent.md) | Search-log and secure-search planning |
| services-agent | [`agent/services-agent.md`](./agent/services-agent.md) | Establishment and branch planning |
| categories-agent | [`agent/categories-agent.md`](./agent/categories-agent.md) | Category-management planning |
| requests-agent | [`agent/requests-agent.md`](./agent/requests-agent.md) | Missing-service and recharge-request planning |
| security-agent | [`agent/security-agent.md`](./agent/security-agent.md) | Secrets, auth, routes, RLS boundaries |
| design-agent | [`agent/design-agent.md`](./agent/design-agent.md) | Responsive UI, RTL, accessibility, themes |
| clean-code-agent | [`agent/clean-code-agent.md`](./agent/clean-code-agent.md) | Readability, types, reuse |
| clean-architecture-agent | [`agent/clean-architecture-agent.md`](./agent/clean-architecture-agent.md) | Layering and dependency direction |
| backup-recovery-agent | `agent/backup-recovery-agent.md`, if present | Backup and recovery work only |

If an agent document is missing, report it and continue only within the rules
that are available. Do not invent missing database authority.
