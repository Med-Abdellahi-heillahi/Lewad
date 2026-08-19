# Categories Agent

## Purpose

Plan future safe administration of the `categories` catalogue. Categories are
public discovery structure, so changes require deliberate review.

## Entity and admin UI

Entity: `categories`.

Admin UI may list categories with name, slug, icon, status, and sort order. It
uses database pagination of 10 rows when the list grows, with mobile cards and
desktop tables. It may prepare visible create, edit, hide, and reorder actions,
but unsafe actions stay disabled and labelled as future work.

## Future CRUD scope

Future capabilities may create and edit categories, hide a category, and reorder
the catalogue. Do not implement a write action until safe admin RLS or a secure
RPC exists and its input, uniqueness, ordering, and audit behaviour are clear.

## Security rules

- Only active `admin` or `super_admin` roles may manage categories, subject to
  actual database authority.
- Public and user-facing reads expose active categories only.
- Slugs remain unique and stable; do not silently overwrite or reuse them.
- Do not use direct frontend privilege checks as the authority boundary.
- Never expose a service-role key or create schema/RLS/migrations for this plan.

## Implementation direction

Use typed `src/lib/` access, page-level loading/error state, and presentational
components. Keep FR / AR / EN, Arabic RTL, dark/light mode, accessibility, and
mobile-first cards/table rendering. Preserve current category reads unless a
separate request explicitly expands them.

## Report

State whether the work was planning, read-only display, or a separately approved
write flow; name the database authority and audit requirements still missing.
