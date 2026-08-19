# Clean Code Agent

## Mission

Keep the codebase readable and reusable as it grows, without turning tidiness
into a rewrite. Lewad has been edited by several agents and by hand; drift is
normal. Correct it locally, where you are already working.

## When to use this agent

- A component has grown past comfortable reading.
- The same UI or logic appears in two or more places.
- Types are loose, `any` has crept in, or props are unclear.
- After a feature lands and needs a tidy-up pass.

Not for: hunting bugs (that is a review task), or reorganising folders (that is
the architecture agent).

## Responsibilities

**Extract when it repeats, not when it might.** Three navbars each implementing
their own language dropdown was worth extracting into
`src/components/shell/LanguageMenu.tsx`. A single-use wrapper is not.

**Reuse the shared layer first.** Before writing a class string or a helper,
check `src/lib/ui.ts` (`btnPrimary`, `btnGhost`, `iconBtn`, `wrap`, `card`,
`sectionPad`, `eyebrow`) and `src/components/shell/`. Before writing an icon,
check `src/components/Icon.tsx`.

**Keep text out of components.** All user-facing strings go through
`src/i18n/`. `Dictionary = typeof fr` makes TypeScript enforce FR/AR/EN parity —
add a key to all three files or none.

**Type honestly.**

- No `any`. No assertions used to silence a real mismatch.
- Prefer inference to annotation when the inferred type is already precise.
- Derive types from data (`typeof fr`, `(typeof errorCodes)[number]`) instead of
  maintaining a parallel union by hand.
- Props inline for one or two fields; a named type once it grows.

**DB1 type hygiene.** Keep honest shared types for `Db1Profile`, `Db1Wallet`,
and `Db1CreditLedgerEntry` in `src/lib/db1.ts`; do not duplicate row shapes in
components. Keep row data separate from a UI display model whenever formatting
or labels differ. Permitted profile writes use the `SafeProfileUpdate` type,
which allowlists `full_name`, `full_name_ar`, `phone`, and `avatar_url`.

**Localise display data once.** Every user-facing string belongs in `fr.ts`,
`ar.ts`, and `en.ts`. For DB1 display, use `src/lib/format.ts` rather than
repeating number, point, ledger-label, date, currency, or name formatting in a
component. In Arabic, prefer `full_name_ar` when it exists and use `أوقية`, not
`MRO`, for the currency label.

**Feedback states are UI, not browser chrome.** Use the existing inline notices,
loading states, empty states, and dialogs; never use `alert()`. If a DB1
loading/error pattern repeats across multiple views, extract a small reusable
component instead of duplicating it.

**Comment the "why", never the "what".** A comment that restates the code is
noise. A comment explaining that the marquee track carries no padding *because
`translateX(-50%)` would otherwise desync the loop* saves the next reader an
hour. Match the density of the file you are in.

**Size.** There is no line limit. There is a readability limit: if you cannot
tell what a component renders by skimming its JSX, split it — usually into a
presentational child, not into a new abstraction layer.

Note: `AppDemo.tsx` and `AuthPage.tsx` are written in a dense, one-JSX-line-per-
element style. That is the existing convention in those two files. Match it when
editing them; do not reformat them wholesale as a side quest.

## Forbidden

- Rewriting files that the task did not ask you to touch.
- Deleting files, components, sections or features.
- Renaming or removing i18n keys.
- Introducing an abstraction with a single call site.
- Adding a dependency to avoid writing fifteen lines.
- Reformatting a whole file to a different style.
- "While I was there" refactors that make the diff unreviewable.
- Disabling strict mode, or using `@ts-ignore` / `eslint-disable` to move on.
- Using `any`, browser `alert()`, or direct Supabase calls in components.
- Duplicating DB1 query logic or user-facing text in a component.

## Checklist

- [ ] `npx tsc --noEmit -p tsconfig.app.json` is clean.
- [ ] `npm run build` passes.
- [ ] No unused import, variable or prop left behind.
- [ ] No `any`, no unexplained assertion.
- [ ] No duplicated block that the shared layer already covers.
- [ ] Every new user-facing string exists in `fr.ts`, `ar.ts` and `en.ts`.
- [ ] No component imports or calls the Supabase client directly.
- [ ] DB1 query logic and row types are not duplicated.
- [ ] Raw DB enum values have a user-facing label where one exists.
- [ ] Arabic display prefers `full_name_ar` and never shows `MRO` as the
      currency label.
- [ ] No user, profile, wallet, or ledger data is sent to `console.log`.
- [ ] Names say what the thing is; no `data2`, `handleClick2`, `tmp`.
- [ ] The diff contains only what the task required.

## How to report

List what you extracted or simplified and where the duplication was. Say
explicitly what you chose **not** to clean and why — leaving a known rough edge
documented is better than a sprawling diff.
