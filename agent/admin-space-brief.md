# Admin & Super Admin Space — Implementation Brief

Audience: whoever implements the next admin iteration (Codex). Read
[`CLAUDE.md`](../CLAUDE.md) and [`design-agent.md`](./design-agent.md) +
[`security-agent.md`](./security-agent.md) first.

---

## 1. What already exists (verified in code, not assumed)

| Piece | State |
|---|---|
| `/admin` route | Works — `App.tsx` → `RequireAuthentication` → `AccountProvider` → `RequireAdmin` → `AdminPage` |
| `RequireAdmin` | `AdminPage.tsx:94` — allows `role in (admin, super_admin)` **and** `status === 'active'` |
| Tabs | 6: `dashboard`, `requests`, `users`, `credits`, `search-logs`, `services` |
| Data layer | `src/lib/admin.ts` (273 lines) — typed reads + `updateMissingRequestStatus` |
| RLS | `20260819000005_phase_admin_v1_policies.sql` — `is_admin()` + admin `select` on the 8 tables, column-restricted `update` on `missing_service_requests` |
| Role helpers | `src/lib/routeAuth.ts` — `LewadRole`, role normalisation |
| Super admin | **Only a badge + one dashboard card.** No section, no tab. |

**The base is good. This is an extension, not a rewrite.** `AdminPage.tsx` is
369 lines — split it only when the Super Admin section makes it unwieldy.

---

## 2. Structure decision

**Keep one route: `/admin`.** Do not add `/super-admin`.

Reasons: the router is a hand-rolled `pathname` switch in `App.tsx`; a second
protected route doubles the guard surface for zero user benefit, and every Super
Admin item in V1 is a placeholder. Add a **seventh tab, visible only to
`super_admin`**.

```
/admin
├── Tableau de bord   admin + super_admin
├── Demandes          admin + super_admin
├── Utilisateurs      admin + super_admin
├── Crédits           admin + super_admin
├── Recherches        admin + super_admin
├── Services          admin + super_admin
└── Système           super_admin only   ← new
```

Revisit a separate route only when Super Admin gains real capabilities with
their own RLS policies.

---

## 3. ⚠️ The security fact that governs this whole task

`is_admin()` returns true for **both** `admin` and `super_admin`:

```sql
where profile.role in ('admin', 'super_admin')
  and profile.status = 'active'
```

**At database level, admin and super_admin are identical today.** Hiding the
Système tab from an `admin` is a UI affordance, not a boundary — an `admin` can
still call the same PostgREST endpoints directly.

That is **acceptable for V1 only because every Super Admin item is a
placeholder that reads nothing privileged**. The moment a Super Admin action
touches real data or real privilege, it needs:

1. `public.is_super_admin()` — same shape as `is_admin()`, `role = 'super_admin'` only;
2. its own RLS policy or `security definer` RPC gated on that function;
3. an audit trail.

Do not ship a Super Admin capability that relies on the tab being hidden.

Related: two migrations share the `20260819000005_` prefix
(`_phase_admin_v1_policies` and `_profile_phone_unique_and_avatar_storage`).
Ordering between them is ambiguous — worth renumbering before more land.

---

## 4. Files to create / adjust

Incremental. Nothing is deleted.

| File | Action |
|---|---|
| `src/components/admin/SuperAdminPanel.tsx` | **new** — the Système tab content, presentational only |
| `src/components/admin/adminCopy.ts` | **new** — FR/AR/EN dictionary for the admin space (see §7) |
| `src/components/AdminPage.tsx` | adjust — add the tab, gate it on `super_admin`, read labels from `adminCopy` |
| `src/lib/admin.ts` | adjust only if the Système tab needs a count it does not already have |
| `src/i18n/*` | **do not touch** — admin copy is internal and stays out of the product dictionaries |

Split `AdminPage.tsx` into `admin/AdminRequests.tsx`, `AdminUsers.tsx` etc.
**only if** it passes ~500 lines. Splitting a working 369-line file is churn.

---

## 5. Role-based UX

| | `user` | `admin` | `super_admin` |
|---|---|---|---|
| `/admin` | Access denied screen | Dashboard | Dashboard |
| 6 operational tabs | — | Visible | Visible |
| Système tab | — | **Not rendered** | Visible |
| Role badge | — | `Admin`, neutral | `Super Admin`, filled |

Rules:

- Gate by **not rendering**, never by `disabled` or `hidden` — a disabled tab
  advertises a capability the user cannot have.
- `status !== 'active'` is already treated as denied. Keep it.
- Deep link `/admin?tab=system` as an `admin` must fall back to the dashboard,
  not error.
- Existing access-denied screen is fine; do not replace it.

---

## 6. Layout guidance

### The table problem

Current tables use `min-w-[620px]` to `min-w-[1120px]` inside a horizontal
scroller. On a 390px screen that is a 3-screen-wide sideways scroll — the brief
explicitly rules this out.

**Rule: one row = one card below `lg`, table from `lg` up.** Same data, two
renderings, no `min-w` on mobile.

```tsx
{/* Mobile: cards. Desktop: table. */}
<ul className="grid gap-2 lg:hidden">…</ul>
<div className="hidden lg:block"><table>…</table></div>
```

Per card: primary identifier bold, status badge top-end, 2–3 secondary fields as
`label: value`, actions in a full-width row at the bottom (≥44px targets).

### Visual register

Admin must not look like the landing. It should read as an internal tool:

- Reuse the neutral member palette — put `data-surface="app"` on the admin root
  so tokens resolve to the black/white/grey set (see `src/index.css`).
- Denser rhythm than the member area: `py-3`/`py-4`, not `py-10`.
- Status carries colour, nothing else: `--answer` green (added/active),
  `--ask` red (rejected), neutral grey (pending/reviewed/duplicate). Never
  colour a whole card by status.
- Super Admin sections get a visible outline + warning banner, not a colour theme.
- Numbers use `tabular`; identifiers (email, phone, UUID) use `ltr-isolate` so
  Arabic layout does not reverse them.
- Every list needs a real empty state — a sentence, not a blank panel.

---

## 7. Copy for the Système tab

Internal tool, three locales, in a local `adminCopy` dictionary (same pattern as
`appCopy` in `AppDemo.tsx`). Not in `src/i18n/`.

**Section title** — FR `Système` · AR `النظام` · EN `System`

**Permanent banner at the top of the tab:**

- FR — `La gestion des rôles, des admins et des paramètres sensibles sera activée dans une prochaine étape.`
- AR — `ستُفعَّل إدارة الأدوار والمشرفين والإعدادات الحسّاسة في مرحلة لاحقة.`
- EN — `Role, admin and sensitive-settings management will be enabled in a later phase.`

**Security reminder (in the security block):**

- FR — `Les actions sensibles doivent être protégées par RLS, journal d'audit et confirmation explicite.`
- AR — `يجب حماية الإجراءات الحسّاسة بسياسات RLS وسجلّ تدقيق وتأكيد صريح.`
- EN — `Sensitive actions must be protected by RLS, an audit log and an explicit confirmation.`

**On every disabled future action:**

- FR — `Cette action sera disponible uniquement après validation de la sécurité.`
- AR — `لن يتوفر هذا الإجراء إلا بعد التحقق الأمني.`
- EN — `This action will only become available after a security review.`

**Blocks to render (all read-only in V1):**

1. **Aperçu système** — counts already available from `getAdminOverview()`. No new query.
2. **Sécurité** — static checklist: RLS active on the 8 tables · no service-role
   key in the client · admin reads least-privilege · request update limited to
   3 columns · `is_admin()` does not yet separate super_admin.
3. **Sauvegarde et restauration** — reminder that backups are configured in the
   Supabase console, with the date of the last verified restore test left blank
   for the team to fill.
4. **Gestion des admins** — placeholder, disabled.
5. **Gestion des rôles** — placeholder, disabled.
6. **Actions sensibles** — placeholder, disabled, warning banner.

Placeholders must be visibly inert: `disabled` button, muted text, warning
sentence. No control that looks like it might work.

---

## 8. Codex implementation checklist

1. Create `src/components/admin/adminCopy.ts`; move the existing inline
   `locale === 'ar' ? … : …` ternaries in `AdminPage.tsx` into it.
2. Create `src/components/admin/SuperAdminPanel.tsx` — presentational, receives
   `overview` as a prop, performs **no** data fetch of its own.
3. In `AdminPage.tsx`: append `{ id: 'system', … }` to `tabs`, filter the array
   with `isSuperAdmin` before rendering, and render the panel for that tab.
4. Guard the tab state: if `activeTab === 'system'` and not `super_admin`, reset
   to `dashboard`.
5. Add `data-surface="app"` to the admin root wrapper.
6. Convert the widest tables (`users`, `credits`, `search-logs`) to the
   card/table split from §6. Leave the narrow ones if they already fit.
7. Do **not** add RLS, migrations, role editing or destructive actions.

### Tests

```bash
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

| Role | Scenario | Expected |
|---|---|---|
| `user` | open `/admin` | Access denied, no tab rendered |
| `admin` | open `/admin` | 6 tabs, **no** Système tab |
| `admin` | force `activeTab='system'` | falls back to dashboard |
| `super_admin` | open `/admin` | 7 tabs, Système visible, all actions inert |
| any admin | request status change | still saves; only `status`/`admin_note` change |

Also: 390px and 1440px · light and dark · FR, AR (RTL), EN · no horizontal
overflow on any tab · no console errors.

---

## 9. Explicitly out of scope

No DB4 · no payment · no wallet mutation · no ledger insert · no role editing
from the frontend · no destructive action · no service-role key · no new tables
· no new RLS policies or migrations unless requested separately.
