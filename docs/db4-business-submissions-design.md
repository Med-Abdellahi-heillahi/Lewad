# DB4 Business Submissions Design Plan

**Status:** Design / UX planning only. No code, migration, or Supabase change was made.
**Audience:** OpenCode (implementation), plus the project owner for the pricing and access decisions flagged below.
**Grounded in:** the shipped recharge flow, `admin_create_establishment`, and the current `/admin` Requests UI — this plan reuses proven patterns rather than inventing new ones.

---

## Design Principles Taken From The Existing Codebase

Three shipped mechanisms already solve most of DB4's hard problems. The plan below reuses them rather than designing around them.

| Existing mechanism | What DB4 reuses it for |
|---|---|
| `create_recharge_request` — client sends an offer code only; PostgreSQL resolves the price | The submission fee. **The browser never sends an amount.** |
| `/recharge` WhatsApp handoff — create record, then open WhatsApp pre-filled with the request id | The "contact Lewad to pay" step |
| `admin_create_establishment(… sourceRequestId)` — creates an approved establishment + active main branch and links back to the source request | Approving a submission into a searchable establishment |
| `AdminRequests` — compact table/cards, icon actions, confirm modal, inline notice | The admin review UI |

**The single most important rule for this feature:** the amount and the approval decision are server-side. The client displays them; it never decides them. This is the same boundary that `agent/security-agent.md` and `agent/credits-agent.md` already enforce for recharges.

---

## User Flow

```
/app search → no result            /add-business entry points:
        │                            · "Ajouter mon établissement" on /add-business
        ▼                            · footer / account menu link
  ┌─────────────────────────────────────────────────────────┐
  │ 1. Intro card — what this is, what happens after         │
  │ 2. Owner information      (required)                     │
  │ 3. Business information   (required)                     │
  │ 4. Contact & location     (optional)                     │
  │ 5. Amount card — fee read from the server                │
  │ 6. Submit                                                │
  └─────────────────────────────────────────────────────────┘
        │  createBusinessSubmission()  ← no amount in the payload
        ▼
  ┌─────────────────────────────────────────────────────────┐
  │ Success state (replaces the form, does not navigate)     │
  │  · "Demande envoyée"                                     │
  │  · Submission ID (copyable)                              │
  │  · Amount to pay, as returned by the server              │
  │  · WhatsApp button, pre-filled with the ID               │
  │  · "What happens next" — 3 steps                         │
  └─────────────────────────────────────────────────────────┘
        │
        ▼  user pays outside the product, team verifies
  Admin review → approved → establishment created → searchable
```

**Status vocabulary:** `pending_review` · `approved` · `rejected` · `cancelled`.

**No fake approval anywhere.** The success state confirms *receipt of a request*, never publication. Copy is explicit that verification precedes publication.

### Access decision — recommend authenticated, not anonymous

`/add-business` is currently behind `RequireAuthentication` in `src/App.tsx`. **Keep it that way.** Reasons:

- RLS needs `auth.uid()` to own the row, so the submitter can read their own submission and nobody else's.
- Anti-spam needs a per-account rate limit — the advisory-lock pattern in `create_missing_service_request` (5/hour) applies directly. An anonymous form has no such handle.
- "My submissions" (below) is meaningless without an account.
- The submitter must be reachable for verification; an account gives a verified email.

If the owner wants an anonymous entry point for marketing reasons, the recommended shape is: public landing section explaining the offer → sign-up → `/add-business`. Do not build an anonymous write path.

---

## Admin Flow

```
/admin → Demandes tab
   ┌──────────────────────────────────────────────┐
   │ [ Services manquants ] [ Soumissions (3) ]   │  ← segmented control
   └──────────────────────────────────────────────┘
                    │
                    ▼  Soumissions
   compact list (cards < lg, table ≥ lg)
   business · owner · phone · status · amount · date · actions
                    │
        ┌───────────┼────────────┬──────────────┐
        ▼           ▼            ▼              ▼
      View       Approve      Reject          Note
     (modal)   (confirm)   (reason required) (modal)
                    │
                    ▼
   admin_approve_business_submission(id)
     · creates approved establishment + active main branch
     · links resolved_establishment_id
     · marks submission approved
     · writes admin_audit_events
     all in one transaction
```

### Why a subsection, not a seventh tab

The prompt recommends a subsection first, and the codebase agrees: `agent/design-agent.md` warns that an overloaded nav is a design failure, and `/admin` already carries six tabs plus a mobile bottom bar limited to four targets. A segmented control at the top of the existing Requests tab adds the surface without adding navigation weight. Promote it to its own tab only if submission volume makes the shared tab unwieldy.

### Approval must be one server-side transaction

Approval is **not** "call `admin_create_establishment`, then update the submission" from React. Two calls can half-fail and leave an approved submission with no establishment, or an establishment with a still-pending submission. It must be a single RPC that does both, mirroring how `admin_create_establishment` already resolves a missing-service request in one transaction.

---

## Screens

### 1. `/add-business` — Add Business form

| Section | Fields | Notes |
|---|---|---|
| Intro card | — | Icon, title, one-paragraph explanation, and the verification promise. Sets expectations before any field |
| Owner information | `owner_first_name`*, `owner_last_name`*, `owner_phone`* | Pre-fill from the signed-in profile where available (`full_name`, `phone`), editable — the owner may differ from the account holder |
| Business information | `business_name_fr`*, `business_name_ar`*, `business_phone`* | Arabic name gets `dir="rtl"`, Latin gets `dir="auto"` |
| Contact & location | `whatsapp`, `website`, `category`, `location`, `nearest_place` | Visually de-emphasised: lighter section header plus an "Optionnel" chip. Never marked with the required asterisk |
| Amount | — | Read-only card. Fee comes from the server (see below) |
| Submit | — | Sticky bottom bar on mobile, inline on desktop |

**Category** should be a `<select>` populated from `getActiveCategories()` in `src/lib/db2.ts`, which already exists and reads only `status = 'active'` rows. Free-text categories would fragment the taxonomy.

### 2. Success state

Replaces the form in place — no route change, so a refresh does not resubmit. Contains:

- Success icon + "Demande envoyée"
- Submission ID in a copy-to-clipboard row, `ltr-isolate` so it stays readable in Arabic
- Amount to pay, exactly as returned by the server
- Primary WhatsApp button, pre-filled (see message template below)
- "Ce qui se passe ensuite" — three numbered steps: *paiement → vérification → publication*
- Secondary link back to `/app`

WhatsApp fallback: `/recharge` already handles a blocked popup by showing "WhatsApp ne s'est pas ouvert automatiquement" with a manual link. Reuse that exact behaviour.

### 3. "Mes demandes" — submission history

**Recommend deferring to V1.1.** It needs a list route, an empty state, and its own copy, and it delivers nothing until at least one submission exists.

The V1 substitute costs almost nothing: after a successful submission, persist the id in `localStorage` (`lewad_last_business_submission`) and show a slim status strip at the top of `/add-business` on return visits — "Demande en cours de vérification · ID xxxx". When the history page lands, that strip becomes its entry point.

### 4. Admin review UI

**List row / card:** business name (bold, `dir="auto"`), owner name + phone beneath, status badge, amount (`tabular`), relative date, action icons.

**Actions** — icon buttons, each with `aria-label` **and** `title`, following `AdminRequests`:

| Action | Icon | Tone | Behaviour |
|---|---|---|---|
| View details | `Eye` | primary | Opens detail modal |
| Approve | `CheckCircle` | success | Confirm modal, then RPC |
| Reject | `XCircle` | danger | Modal with **required** reason |
| Add note | `StickyNote` | neutral | Note modal |

Disable an action that matches the current status and set its `title` to explain why — the pattern already used for request statuses.

**Detail modal:** owner block, business block, contact/location block, amount, category, submitted date, admin note, then approve/reject in the footer.

### 5. Super Admin overview

Three KPI cards on `/super-admin`, using the existing `AdminMetricCard`: *Soumissions en attente*, *Approuvées ce mois*, *Rejetées ce mois*.

Only render them once the table exists and returns real counts. If the module is not deployed, follow the established convention: show the "unavailable" label, never `0`. `AdminAnalytics.rechargeModule` already demonstrates this exact degradation.

---

## Components

New:

```
src/components/business/BusinessSubmissionForm.tsx    grouped sections + validation
src/components/business/BusinessSubmissionSuccess.tsx receipt + WhatsApp handoff
src/components/admin/AdminSubmissions.tsx             admin list + modals
src/lib/businessSubmissions.ts                        typed data access (RPC only)
```

Reused as-is — no new primitives needed:

```
AppShell · PageHeader · SectionTitle          page frame
field · fieldLabel · fieldHint · btnPrimary   form styling (src/lib/ui.ts)
AdminModal · AdminActionButton                admin dialogs and actions (AdminUi.tsx)
AdminStatusBadge                              status pills
InlineAlert · EmptyState · LoadingCard        feedback states
PaginationControls                            admin list paging
isValidMauritanianPhone · isRequiredArabicName  validation (src/lib/validation.ts)
getActiveCategories                           category select (src/lib/db2.ts)
```

**One new validation helper is required** — `isValidWebsiteUrl(value: string)` in `src/lib/validation.ts`. It should accept an empty string (the field is optional), require `http:`/`https:` only, and reject anything else. Do not accept a bare `javascript:` or protocol-relative value.

**Layering:** `src/lib/businessSubmissions.ts` is the only file that touches Supabase, exactly like `src/lib/recharge.ts`. Components receive data as props or call the lib; no component imports the Supabase client. This is `agent/clean-architecture-agent.md`'s dependency rule.

---

## Mobile Layout (390px reference)

- Single column, sections stacked as cards with `gap-4`.
- Section headers act as progress markers: a small numbered chip plus the label — the guided feel the brief asks for, without wizard state.
- **Sticky bottom submit bar**: `fixed inset-x-0 bottom-0`, `pb-[calc(0.75rem+env(safe-area-inset-bottom))]`, showing the amount on the start side and the submit button on the end side. Give the page `pb-24` so the bar never covers the last field.
- Inputs at `h-12` (existing `field` class) — comfortable thumb targets, and iOS will not zoom on focus at 16px.
- Amount card sits directly above the submit bar so the cost is visible at the moment of commitment.
- No horizontal overflow: `min-w-0` on every flex child, `break-words` on names, `ltr-isolate` on phone, website and submission ID.

## Desktop Layout (1280px reference)

- Content column capped at `max-w-3xl`, centred — a full-width form reads as a data-entry tool, not a product.
- Two columns from `lg` **within** a section where fields pair naturally (first/last name; FR/AR business name). Sections themselves stay stacked.
- Amount card and submit move inline at the end; the sticky bar is mobile-only.
- Admin list: cards below `lg`, `table-fixed` compact table from `lg` up — the split already used by `AdminRequests` and `AdminUsers`.

---

## i18n Copy FR / AR / EN

**Placement:** user-facing copy goes in `src/i18n/{fr,ar,en}.ts` under a new `addBusiness` key. Admin review copy goes in `src/components/admin/adminCopy.ts` under a new `submissions` key. That split is required by `agent/admin-space-brief.md` — admin copy stays out of the product dictionaries.

**Contract:** add the key to all three dictionaries in the same change. `Dictionary = typeof fr` makes TypeScript enforce parity. Never rename or remove an existing key.

### User-facing (`addBusiness`)

| Key | FR | AR | EN |
|---|---|---|---|
| `title` | Ajouter mon établissement | إضافة مؤسستي | Add my business |
| `subtitle` | Présentez votre activité à Lewad | عرّف بنشاطك على Lewad | Introduce your activity to Lewad |
| `ownerSection` | Informations du propriétaire | معلومات المالك | Owner information |
| `businessSection` | Informations de l'établissement | معلومات المؤسسة | Business information |
| `contactSection` | Coordonnées | معلومات الاتصال | Contact details |
| `locationSection` | Localisation | الموقع | Location |
| `optional` | Optionnel | اختياري | Optional |
| `firstName` | Prénom | الاسم الشخصي | First name |
| `lastName` | Nom | اللقب | Last name |
| `ownerPhone` | Téléphone du propriétaire | هاتف المالك | Owner phone |
| `nameFr` | Nom en français | الاسم بالفرنسية | Name in French |
| `nameAr` | Nom en arabe | الاسم بالعربية | Name in Arabic |
| `businessPhone` | Téléphone de l'établissement | هاتف المؤسسة | Business phone |
| `whatsapp` | WhatsApp | واتساب | WhatsApp |
| `website` | Site web | الموقع الإلكتروني | Website |
| `category` | Catégorie | الفئة | Category |
| `location` | Localisation | الموقع | Location |
| `nearestPlace` | Lieu le plus proche | أقرب مَعلَم | Nearest place |
| `amountTitle` | Montant à payer | المبلغ المطلوب دفعه | Amount to pay |
| `amountHint` | Le montant est fixé par l'équipe Lewad. | يحدد فريق Lewad المبلغ. | The amount is set by the Lewad team. |
| `submit` | Soumettre la demande | إرسال الطلب | Submit request |
| `submitting` | Envoi en cours… | جارٍ الإرسال… | Sending… |
| `verifyNotice` | Après soumission, l'équipe Lewad vérifiera les informations et le paiement avant publication. | بعد الإرسال، سيتحقق فريق Lewad من المعلومات والدفع قبل النشر. | After submission, the Lewad team will verify the information and the payment before publication. |
| `sentTitle` | Demande envoyée | تم إرسال الطلب | Request sent |
| `sentText` | Votre demande est en attente de validation. | طلبك في انتظار التحقق. | Your request is awaiting validation. |
| `sentVerify` | L'équipe Lewad vérifiera vos informations avant publication. | سيتحقق فريق Lewad من المعلومات قبل النشر. | The Lewad team will verify your information before publication. |
| `submissionId` | Numéro de demande | رقم الطلب | Request ID |
| `copyId` | Copier le numéro | نسخ الرقم | Copy the ID |
| `contactWhatsApp` | Contacter sur WhatsApp | التواصل عبر واتساب | Contact on WhatsApp |
| `nextSteps` | Ce qui se passe ensuite | ما يحدث بعد ذلك | What happens next |
| `step1` | Effectuez le paiement avec l'équipe Lewad. | أتمم الدفع مع فريق Lewad. | Complete the payment with the Lewad team. |
| `step2` | L'équipe vérifie vos informations. | يتحقق الفريق من معلوماتك. | The team verifies your information. |
| `step3` | Votre établissement apparaît dans la recherche. | تظهر مؤسستك في البحث. | Your business appears in search. |
| `pendingStrip` | Demande en cours de vérification | طلبك قيد التحقق | Request under verification |

**Validation messages**

| Key | FR | AR | EN |
|---|---|---|---|
| `errRequired` | Ce champ est obligatoire. | هذا الحقل إلزامي. | This field is required. |
| `errPhone` | Numéro invalide : 8 chiffres commençant par 2, 3 ou 4. | رقم غير صالح: ٨ أرقام تبدأ بـ 2 أو 3 أو 4. | Invalid number: 8 digits starting with 2, 3 or 4. |
| `errArabic` | Le nom en arabe doit être écrit en caractères arabes. | يجب كتابة الاسم بالعربية بحروف عربية. | The Arabic name must be written in Arabic characters. |
| `errWebsite` | Adresse invalide. Exemple : https://exemple.mr | عنوان غير صالح. مثال: https://exemple.mr | Invalid address. Example: https://example.mr |
| `errSubmit` | Impossible d'envoyer la demande. Réessayez dans un instant. | تعذر إرسال الطلب. حاول بعد قليل. | Could not send the request. Please try again shortly. |
| `errDuplicate` | Vous avez déjà une demande en attente pour cet établissement. | لديك بالفعل طلب معلق لهذه المؤسسة. | You already have a pending request for this business. |
| `errRateLimited` | Trop de demandes. Réessayez plus tard. | طلبات كثيرة. حاول لاحقًا. | Too many requests. Please try again later. |

### Admin-facing (`adminCopy.submissions`)

| Key | FR | AR | EN |
|---|---|---|---|
| `title` | Soumissions | الطلبات المقدَّمة | Submissions |
| `subtitle` | Établissements proposés par leurs propriétaires. | مؤسسات اقترحها أصحابها. | Businesses submitted by their owners. |
| `tabMissing` | Services manquants | الخدمات الناقصة | Missing services |
| `tabSubmissions` | Soumissions | الطلبات المقدَّمة | Submissions |
| `business` | Établissement | المؤسسة | Business |
| `owner` | Propriétaire | المالك | Owner |
| `amount` | Montant | المبلغ | Amount |
| `viewDetails` | Voir les détails | عرض التفاصيل | View details |
| `approve` | Valider | اعتماد | Approve |
| `reject` | Rejeter | رفض | Reject |
| `editNote` | Modifier la note interne | تعديل الملاحظة الداخلية | Edit internal note |
| `approveTitle` | Confirmer la validation | تأكيد الاعتماد | Confirm approval |
| `approveText` | Cet établissement sera publié et visible dans la recherche. | ستُنشر هذه المؤسسة وتظهر في البحث. | This business will be published and visible in search. |
| `rejectTitle` | Rejeter la demande | رفض الطلب | Reject request |
| `rejectReason` | Motif de rejet | سبب الرفض | Rejection reason |
| `rejectReasonRequired` | Le motif de rejet est obligatoire. | سبب الرفض إلزامي. | A rejection reason is required. |
| `approved` | Demande validée. | تم اعتماد الطلب. | Request approved. |
| `rejected` | Demande rejetée. | تم رفض الطلب. | Request rejected. |
| `actionFailed` | Impossible de traiter la demande. | تعذر معالجة الطلب. | Could not process the request. |
| `emptyTitle` | Aucune soumission | لا توجد طلبات | No submissions |
| `emptyText` | Les demandes des propriétaires apparaîtront ici. | ستظهر هنا طلبات أصحاب المؤسسات. | Owner requests will appear here. |
| `notConnected` | Module soumissions non déployé sur cette base. | وحدة الطلبات غير منشورة على هذه القاعدة. | Submissions module is not deployed on this database. |

### Status labels — add to `adminCopy.content.status`

| Key | FR | AR | EN |
|---|---|---|---|
| `pending_review` | En attente de vérification | في انتظار التحقق | Awaiting review |
| `cancelled` | Annulée | ملغاة | Cancelled |

`approved` and `rejected` already exist and must be reused, not duplicated.

### WhatsApp message template

Mirror `rechargeWhatsAppUrl` in `src/components/AppPages.tsx`: build the lines, `filter(Boolean)`, join with `\n`, `encodeURIComponent`, append to `contact.whatsappHref`.

```
Bonjour Lewad, je souhaite ajouter mon établissement.

Établissement : {business_name_fr}
Propriétaire : {owner_first_name} {owner_last_name}
Téléphone : {owner_phone}
Montant : {amount_mro} MRO
ID demande : {submission_id}

Merci.
```

Localise the labels; keep the values verbatim. Arabic uses `أوقية` for the currency via the existing `formatCurrency` helper — never `MRO` in an Arabic sentence.

---

## Empty / Loading / Error States

| Surface | State | Treatment |
|---|---|---|
| Form | Submitting | Submit button disabled, label → `submitting`, `aria-busy`. Fields stay readable, not greyed |
| Form | Field invalid | Inline message under the field, `text-ask`, with `aria-invalid` + `aria-describedby`. Error clears as the user fixes that field; full revalidation waits for submit |
| Form | Submit failed | `InlineAlert tone="error"` above the submit bar. **Form state is preserved** — never clear a filled form on failure |
| Form | Rate limited / duplicate | Distinct copy (`errRateLimited` / `errDuplicate`), not the generic error |
| Amount card | Fee loading | `Skeleton` in place of the figure. **Never render a hardcoded fallback price** |
| Amount card | Fee unavailable | "Montant communiqué par l'équipe" + WhatsApp link. Submission may still proceed |
| Admin list | Loading | `LoadingCard` skeletons, matching the Requests tab |
| Admin list | Empty | `EmptyState` with `emptyTitle` / `emptyText` |
| Admin list | Module absent | `notConnected` card — the `AdminRechargeModule` degradation pattern, never fabricated rows |
| Admin action | In flight | Row actions disabled, spinner on the acting button |
| Admin action | Result | Inline `RequestNotice`-style banner, auto-dismiss after 3 s. **Never `alert()` or `confirm()`** |

---

## Accessibility Notes

- Each section is a `<section>` with `aria-labelledby` pointing at its heading; the form is one `<form noValidate>` so inline errors are not preempted by native bubbles.
- Required fields: `required` attribute **and** a visible `*` with the legend "Les champs marqués d'un astérisque sont obligatoires."
- Errors: `aria-invalid` plus `aria-describedby` on the input; the container gets `role="alert"` only on submit failure, so a screen reader is not interrupted mid-typing.
- Success state gets `role="status"` and receives focus after submission, so a screen-reader user learns the outcome without hunting.
- All interactive targets ≥ 44×44px, including admin icon buttons.
- The sticky mobile bar must not trap focus; it sits after the form in DOM order.
- Modals follow `AdminModal`: `role="dialog"`, `aria-modal`, labelled title, Escape to close, focus moved in and restored out, body scroll locked.
- RTL: logical properties only (`ms-`, `pe-`, `start-`, `end-`). Phone, website, amount and submission ID wrapped in `ltr-isolate`. Directional icons get `rtl:rotate-180`.
- Respect `prefers-reduced-motion` on any section transition.
- Contrast ≥ 4.5:1 for body text; status is never conveyed by colour alone — every badge carries a text label.

---

## Handoff Notes for OpenCode

### Must-follow rules

1. **The fee is server-side.** The client sends no amount. Follow `create_recharge_request`: the RPC owns the price and returns it. Do not hardcode `500` in `src/`, not even as a fallback.
2. **Approval is one RPC, one transaction** — create establishment + main branch, link `resolved_establishment_id`, set status, write `admin_audit_events`. Do not chain two calls from React.
3. **Submissions never write `establishments` directly.** `agent/services-agent.md` is explicit: normal users cannot create approved public services. The submission table is a proposal; only the admin RPC publishes.
4. **All Supabase access lives in `src/lib/businessSubmissions.ts`.** No component imports the client.
5. **Degrade, don't fabricate.** If the table/RPC is not deployed, detect it with the existing `isMissingBackend` helper in `src/lib/admin.ts` and report the module as not connected.
6. **i18n parity** — add every key to `fr`, `ar` and `en` in the same change.

### Backend shape this design assumes

Not to be built in this task; recorded so the UI contract is unambiguous. Any migration needs its own explicitly authorised task, and **MED-001 must be resolved before new migrations are pushed** (see `docs/med-001-migration-history-owner-action.md`).

```
business_submissions
  id, user_id, owner_first_name, owner_last_name, owner_phone,
  business_name_fr, business_name_ar, business_phone,
  whatsapp, website, category_id, location, nearest_place,
  amount_mro, status, admin_note, reviewed_by, reviewed_at,
  resolved_establishment_id, created_at, updated_at

status ∈ (pending_review, approved, rejected, cancelled)

RPCs
  create_business_submission(payload without amount) → { id, amount_mro, status }
  get_business_submission_fee()                      → { amount_mro }
  admin_approve_business_submission(id)              → creates + links + audits
  admin_reject_business_submission(id, reason)       → reason required
```

Expected guarantees, matching every shipped RPC: `security definer`, `set search_path = ''`, `auth.uid()` checked, active-admin check inside the function for the admin RPCs, `revoke` from `public`/`anon`, `grant execute` to `authenticated`, row locking on approval, per-account rate limit on creation.

### Two details that will otherwise bite

- **`statusClass()` does not know the new statuses.** `src/components/admin/AdminUi.tsx:10-15` maps `pending`/`approved`/`rejected`. `pending_review` and `cancelled` fall through to neutral grey, so a pending submission would render with no warning tone. Add both to that map — `pending_review` to the brand-soft branch, `cancelled` to neutral — or the badges will silently look wrong.
- **`/add-business` currently renders a placeholder** (`AppPages.tsx:1231-1250`) using `appSearch.addEstablishment` / `addEstablishmentMessage`. Those keys are part of the frozen i18n contract: keep them, do not rename or delete. The new page reads from the new `addBusiness` block.

### Suggested build order

1. `src/lib/businessSubmissions.ts` with typed results and module detection, against a fixture — the UI can be built and reviewed before any backend exists.
2. i18n keys in all three dictionaries.
3. `BusinessSubmissionForm` + `BusinessSubmissionSuccess`, wired to the lib.
4. Replace the `/add-business` placeholder.
5. `AdminSubmissions` behind the segmented control in the Requests tab.
6. Super-admin KPI cards, gated on real data.
7. Backend migration — separate, explicitly authorised task, after MED-001.

---

## Not Implemented

Nothing in this plan was built. No code, migration, RLS policy, RPC, or Supabase configuration was created or changed. Specifically **not** done:

- No `business_submissions` table and no RPCs — those need an authorised backend task, and MED-001 first.
- No payment gateway. Money moves outside the product via WhatsApp, exactly as recharges do today.
- No frontend implementation; `/add-business` is untouched and still shows its placeholder.
- No "My submissions" history page — proposed for V1.1, with a `localStorage` status strip as the cheap V1 substitute.
- No super-admin KPI cards — they need real data first.
- No images or mockups.

### Open decisions for the owner

1. ~~**The fee.**~~ **Resolved 21 August 2026:** flat, server-owned, **200 MRO for 3 months**, fixed by `20260821000004_update_business_submission_amount_200_mro.sql`. It does not vary by category. The earlier 500 MRO figure is retired and survives only for rows created before the change.
2. **Refund/cancellation policy** when a paid submission is rejected. `cancelled` exists in the vocabulary but nothing defines who sets it or what happens to the money.
3. **Anonymous submission.** This plan recommends authenticated-only; confirm.
4. **Who may approve** — active `admin`, or `super_admin` only? This design assumes active `admin` or `super_admin`, consistent with recharge approval.
