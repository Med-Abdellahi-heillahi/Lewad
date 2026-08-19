# Lewad — Agent Guide

> **V1 principle**
> `Search → Find → Contact / Go` · `Chercher → Trouver → Contacter / Aller` · `ابحث → اعثر → تواصل / اذهب`

---

## 🇬🇧 English

### What this folder is

`agent/` holds the working contracts for the AI agents that touch this repository
(Claude Code, Codex, or any other assistant). Each file describes one role: its
mission, what it is allowed to do, what it must never do, and how to report back.

Read the relevant agent file **before** starting a task. If a request conflicts
with an agent's forbidden list, stop and ask instead of guessing.

### Current direction

Lewad is a **local search web app for Mauritania**. A user looks up a shop, a
market, a gym, a pharmacy, a bank agency or any local service, and immediately
gets what they need to act: name, phone, WhatsApp, location, website, nearest
branch and directions.

The product is at **V1**. The landing page, the public demo (`/app`) and
email/password authentication (`/auth`) exist. Credits, payments, business
submission and admin validation are **described but not implemented**.

### Current stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript (strict), Vite |
| Styling | Tailwind CSS v4, tokens in `src/index.css` |
| Animation | framer-motion (`LazyMotion` + `m` components) |
| Backend | Supabase JS client — **Auth only** |
| i18n | Home-grown, `src/i18n/` (FR default, AR RTL, EN) |
| Theme | `data-theme` on `<html>`, `src/lib/theme.tsx` |

### Available agents

| File | Use it for |
|---|---|
| [`design-agent.md`](./design-agent.md) | UI, responsive, navbar, footer, typography, dark/light, RTL, a11y |
| [`security-agent.md`](./security-agent.md) | Keys, secrets, route protection, Auth and RLS assumptions |
| [`clean-code-agent.md`](./clean-code-agent.md) | Readability, reuse, duplication, TypeScript quality |
| [`clean-architecture-agent.md`](./clean-architecture-agent.md) | Folder structure, layer boundaries, backend seams |

### Admin CRUD Agents

These are planning and safety guardrails for future implementation. They do not
authorise a database write, schema change, payment flow, or role change.

| File | Use it for |
|---|---|
| [`users-agent.md`](./users-agent.md) | Profiles and user administration |
| [`credits-agent.md`](./credits-agent.md) | Wallets, ledger, and future recharges |
| [`search-agent.md`](./search-agent.md) | Search logs and secure search behaviour |
| [`services-agent.md`](./services-agent.md) | Establishments and branches |
| [`categories-agent.md`](./categories-agent.md) | Service categories |
| [`requests-agent.md`](./requests-agent.md) | Missing-service and future recharge requests |

### How an agent should work here

1. Read this README, then the agent file matching the task.
2. Survey the existing code before writing — this repo has been edited by
   several agents and by hand.
3. Make the smallest change that fully does the job.
4. Run `npm run build` and check the result in a browser.
5. Report: what changed, which files, what was checked, what was deliberately
   left out.

### Must not be touched without an explicit instruction

- Supabase: no tables, no RLS, no schema, no policies.
- Working authentication (`src/lib/auth.ts`, `src/hooks/useAuthSession.ts`, `/auth`).
- The i18n key contract — values may change, keys may be added, **never renamed
  or removed** (`Dictionary = typeof fr` enforces parity across FR/AR/EN).
- Dark/light mode and the RTL behaviour.
- Existing landing sections and the `/app` demo.
- The framework, the bundler, the styling system.
- No real credits, wallet, payment or admin validation.
- Do not delete files. Improve in place.

---

## 🇫🇷 Français

### À quoi sert ce dossier

`agent/` contient les contrats de travail des agents IA qui interviennent sur ce
dépôt (Claude Code, Codex ou un autre assistant). Chaque fichier décrit un rôle :
sa mission, ce qu'il a le droit de faire, ce qu'il ne doit jamais faire, et
comment rendre compte.

Lisez le fichier d'agent correspondant **avant** de commencer. Si une demande
entre en conflit avec la liste des interdits, arrêtez-vous et posez la question
plutôt que de deviner.

### Direction actuelle

Lewad est une **application web de recherche locale pour la Mauritanie**.
L'utilisateur cherche une boutique, un marché, une salle de sport, une pharmacie,
une agence bancaire ou n'importe quel service local, et obtient immédiatement de
quoi agir : nom, téléphone, WhatsApp, localisation, site web, agence la plus
proche et itinéraire.

Le produit est en **V1**. La landing, la démo publique (`/app`) et
l'authentification e-mail/mot de passe (`/auth`) existent. Les points, les
paiements, l'ajout d'établissement et la validation par l'équipe sont **décrits
mais pas implémentés**.

### Stack actuelle

| Couche | Choix |
|---|---|
| Framework | React 19 + TypeScript (strict), Vite |
| Styles | Tailwind CSS v4, tokens dans `src/index.css` |
| Animation | framer-motion (`LazyMotion` + composants `m`) |
| Backend | client Supabase JS — **Auth uniquement** |
| i18n | maison, `src/i18n/` (FR par défaut, AR en RTL, EN) |
| Thème | `data-theme` sur `<html>`, `src/lib/theme.tsx` |

### Agents disponibles

| Fichier | À utiliser pour |
|---|---|
| [`design-agent.md`](./design-agent.md) | UI, responsive, navbar, footer, typographie, clair/sombre, RTL, accessibilité |
| [`security-agent.md`](./security-agent.md) | Clés, secrets, protection des routes, hypothèses Auth et RLS |
| [`clean-code-agent.md`](./clean-code-agent.md) | Lisibilité, réutilisation, duplication, qualité TypeScript |
| [`clean-architecture-agent.md`](./clean-architecture-agent.md) | Structure des dossiers, frontières entre couches, jointures backend |

### Agents CRUD d’administration

Ces documents sont des garde-fous et des guides de préparation pour les futures
implémentations. Ils n’autorisent ni écriture en base, ni modification de
schéma, ni paiement, ni changement de rôle.

| Fichier | À utiliser pour |
|---|---|
| [`users-agent.md`](./users-agent.md) | Profils et administration des utilisateurs |
| [`credits-agent.md`](./credits-agent.md) | Portefeuilles, journal de crédits et futures recharges |
| [`search-agent.md`](./search-agent.md) | Journaux et comportement de recherche sécurisée |
| [`services-agent.md`](./services-agent.md) | Établissements et succursales |
| [`categories-agent.md`](./categories-agent.md) | Catégories de services |
| [`requests-agent.md`](./requests-agent.md) | Demandes de service manquant et futures recharges |

### Méthode de travail attendue

1. Lire ce README, puis le fichier d'agent correspondant à la tâche.
2. Relever l'état réel du code avant d'écrire — ce dépôt a été modifié par
   plusieurs agents et à la main.
3. Faire le plus petit changement qui traite complètement la demande.
4. Lancer `npm run build` et vérifier le rendu dans un navigateur.
5. Rendre compte : ce qui a changé, quels fichiers, ce qui a été vérifié, ce qui
   a été volontairement laissé de côté.

### À ne pas toucher sans instruction explicite

- Supabase : aucune table, aucune RLS, aucun schéma, aucune policy.
- L'authentification qui fonctionne (`src/lib/auth.ts`, `src/hooks/useAuthSession.ts`, `/auth`).
- Le contrat de clés i18n — les valeurs peuvent changer, on peut ajouter des
  clés, mais **jamais en renommer ni en supprimer** (`Dictionary = typeof fr`
  impose la parité FR/AR/EN).
- Le mode clair/sombre et le comportement RTL.
- Les sections existantes de la landing et la démo `/app`.
- Le framework, le bundler, le système de styles.
- Aucun système réel de points, portefeuille, paiement ou validation admin.
- Ne pas supprimer de fichiers. Améliorer sur place.

---

## 🇲🇷 العربية

### ما هذا المجلد

يحتوي `agent/` على عقود عمل وكلاء الذكاء الاصطناعي الذين يشتغلون على هذا المستودع
(Claude Code أو Codex أو غيرهما). كل ملف يصف دورًا واحدًا: مهمته، وما يُسمح له به،
وما يُمنع عليه، وكيف يقدّم تقريره.

اقرأ ملف الوكيل المناسب **قبل** بدء أي مهمة. وإذا تعارض الطلب مع قائمة الممنوعات،
توقّف واسأل بدل أن تخمّن.

### التوجّه الحالي

لواد **تطبيق ويب للبحث المحلي في موريتانيا**. يبحث المستخدم عن متجر أو سوق أو قاعة
رياضة أو صيدلية أو وكالة بنكية أو أي خدمة محلية، فيحصل فورًا على ما يلزمه للتصرف:
الاسم، والهاتف، وواتساب، والموقع، والموقع الإلكتروني، وأقرب وكالة، والطريق إليها.

المنتج في **الإصدار الأول**. صفحة الهبوط والعرض العام (`/app`) والمصادقة بالبريد
وكلمة المرور (`/auth`) موجودة. أما النقاط والمدفوعات وإضافة المؤسسات والمصادقة من
الفريق فهي **موصوفة وغير منجزة بعد**.

### التقنيات الحالية

| الطبقة | الخيار |
|---|---|
| الإطار | React 19 و TypeScript (صارم) و Vite |
| التنسيق | Tailwind CSS v4، والمتغيرات في `src/index.css` |
| الحركة | framer-motion (عبر `LazyMotion` ومكوّنات `m`) |
| الخلفية | عميل Supabase JS — **للمصادقة فقط** |
| التعدد اللغوي | نظام داخلي في `src/i18n/` (الفرنسية افتراضيًا، العربية RTL، الإنجليزية) |
| السمة | `data-theme` على `<html>` عبر `src/lib/theme.tsx` |

### الوكلاء المتاحون

| الملف | يُستعمل من أجل |
|---|---|
| [`design-agent.md`](./design-agent.md) | الواجهة والتجاوب وشريط التنقل والتذييل والخطوط والوضعين والاتجاه والوصولية |
| [`security-agent.md`](./security-agent.md) | المفاتيح والأسرار وحماية المسارات وفرضيات المصادقة وRLS |
| [`clean-code-agent.md`](./clean-code-agent.md) | الوضوح وإعادة الاستعمال وتفادي التكرار وجودة TypeScript |
| [`clean-architecture-agent.md`](./clean-architecture-agent.md) | بنية المجلدات والحدود بين الطبقات ونقاط الوصل مع الخلفية |

### وكلاء CRUD للإدارة

هذه الوثائق إرشادات تخطيط وحماية للتنفيذ المستقبلي. ولا تمنح صلاحية الكتابة في
قاعدة البيانات أو تغيير المخطط أو الدفع أو تغيير الأدوار.

| الملف | يُستعمل من أجل |
|---|---|
| [`users-agent.md`](./users-agent.md) | الملفات الشخصية وإدارة المستخدمين |
| [`credits-agent.md`](./credits-agent.md) | المحافظ وسجل النقاط وعمليات الشحن المستقبلية |
| [`search-agent.md`](./search-agent.md) | سجلات البحث وسلوك البحث الآمن |
| [`services-agent.md`](./services-agent.md) | المؤسسات والفروع |
| [`categories-agent.md`](./categories-agent.md) | فئات الخدمات |
| [`requests-agent.md`](./requests-agent.md) | طلبات الخدمة الناقصة وطلبات الشحن المستقبلية |

### طريقة العمل المطلوبة

1. اقرأ هذا الملف، ثم ملف الوكيل المناسب للمهمة.
2. افحص الشيفرة الموجودة قبل الكتابة — فقد عدّل هذا المستودع عدة وكلاء ويدويًا كذلك.
3. أنجز أصغر تغيير يفي بالطلب كاملًا.
4. شغّل `npm run build` وتحقّق من النتيجة في المتصفح.
5. قدّم تقريرًا: ما الذي تغيّر، وأي ملفات، وما الذي جرى التحقق منه، وما تُرك عمدًا.

### ما لا يجوز المساس به دون تعليمات صريحة

- Supabase: لا جداول، ولا RLS، ولا مخطط، ولا سياسات.
- المصادقة العاملة (`src/lib/auth.ts` و`src/hooks/useAuthSession.ts` و`/auth`).
- عقد مفاتيح الترجمة — يمكن تغيير القيم وإضافة مفاتيح، لكن **لا يُعاد تسمية مفتاح
  ولا يُحذف** (`Dictionary = typeof fr` تفرض التطابق بين الفرنسية والعربية والإنجليزية).
- الوضعان الفاتح والداكن وسلوك الاتجاه من اليمين إلى اليسار.
- أقسام صفحة الهبوط الحالية وعرض `/app`.
- الإطار وأداة البناء ونظام التنسيق.
- لا نظام حقيقي للنقاط أو المحفظة أو الدفع أو مصادقة الإدارة.
- لا تحذف ملفات. حسِّن في مكانها.
