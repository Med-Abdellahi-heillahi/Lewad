# Lewad Maps UX Plan

**Status:** The submission picker is now implemented locally. The related DB4 coordinate migration remains unapplied remotely.
**Audience:** OpenCode (implementation), plus the project owner for the two decisions flagged in *Handoff Notes*.
**Related:** [`db4-business-submissions-design.md`](./db4-business-submissions-design.md) · [`db4-business-submissions.md`](./db4-business-submissions.md) · [`med-001-migration-history-owner-action.md`](./med-001-migration-history-owner-action.md)

---

> **Product decision — 21 August 2026.** The submission form must never ask users to type, read, or otherwise handle latitude or longitude. A marker is placed by clicking/tapping the map, by the explicit current-location action, or by selecting the current map centre with the keyboard. Coordinates remain internal component state and are submitted only through the existing typed RPC boundary. This decision supersedes every earlier manual-coordinate fallback in this planning document.

---

## The Finding That Shapes This Plan

The two map features are **not** equally ready, and treating them as one feature will produce silent data loss.

| Feature | Backend state | Can ship |
|---|---|---|
| **Search result map** | `branches.latitude` / `branches.longitude` already exist, are range-constrained, indexed, **and already returned by `search_services_with_credit`** (`…security_2b_medium_hardening.sql:246-247`). `Db2Branch` in `src/lib/db2.ts:19-20` already types them, and `db3a.ts` already passes them to the UI | **Yes — frontend only, no migration** |
| **Submission map picker** | `…db4_business_submissions.sql` alone has `location text` / `nearest_place text` and **no coordinate columns**. A follow-up migration `…20260821000003_db4_maps_location_support.sql` now exists **locally** and closes that gap: it adds range-checked `latitude`/`longitude`, makes them required in `create_business_submission`, and writes them into `branches` on approval | **Not yet — the amendment exists in source but is not applied remotely** |

**Consequence:** if the mandatory map picker ships against today's schema, the user is forced to place a marker whose coordinates are then thrown away — and the approved establishment's main branch gets `latitude = null`, so its own search result can never show a map. The feature would quietly defeat itself.

So this plan is explicitly **two phases**:

- **Phase M1 — Search map.** Frontend only. Ship whenever.
- **Phase M2 — Submission picker.** Blocked on a DB4 amendment migration, which is itself blocked on MED-001 and on DB4 being applied remotely at all.

---

## Search Result Map Flow

```
/app search → result card
 ┌────────────────────────────────────────────┐
 │ Bankily                        [approved]  │
 │ Services financiers · Nouakchott           │
 │ ── Lieu proche : Tevragh Zeina ──          │
 │ [ Appeler ] [ WhatsApp ]        ← primary  │
 │ [ Voir sur la carte ] [ Itinéraire ]       │
 └────────────────────────────────────────────┘
              │                    │
   has coords │                    │ no coords
              ▼                    ▼
   bottom sheet / modal      both map buttons absent
   ┌──────────────────┐      "Localisation exacte non disponible"
   │  mini map        │      Lieu proche still shown if present
   │  📍 marker       │
   │  branch name     │
   │  [ Itinéraire ]  │
   └──────────────────┘
              │
              ▼
   external maps app (new tab)
```

**Phone and WhatsApp stay primary.** Lewad's product loop is *Chercher → Trouver → Contacter / Aller*. Contact comes before navigation, so the map buttons are secondary in weight — outline, not filled — and sit on a second row beneath the contact actions.

**Per-branch, not per-establishment.** An establishment can have several branches with different coordinates. "Voir sur la carte" belongs to a branch row. When an establishment has multiple mappable branches, the sheet shows all their markers and highlights the main one, which is what the existing `MockMap` in `AppDemo.tsx:108-116` already gestures at.

### Directions — a link, not an integration

"Itinéraire" opens the device's maps app via a plain URL. **No routing engine, no SDK, no API key** — a URL is not an API integration.

```
https://www.google.com/maps/dir/?api=1&destination={lat},{lng}
```

Opens the native Google Maps app on Android and iOS where installed, and the web map otherwise. Always `target="_blank" rel="noreferrer"`, matching the existing WhatsApp links.

Optional refinement, not required for V1: offer an Apple Maps alternative (`https://maps.apple.com/?daddr={lat},{lng}`) when `navigator.platform` looks like iOS. Two buttons for one action is usually worse than one that works everywhere — prefer the single link unless testing shows a problem.

---

## Business Submission Map Picker Flow

```
/add-business → Localisation section
 ┌──────────────────────────────────────────────────┐
 │ Localisation                                     │
 │                                                  │
 │ Lieu du service                    (optionnel)   │
 │ [ text input ]                                   │
 │                                                  │
 │ Lieu proche                        (optionnel)   │
 │ [ text input ]                                   │
 │                                                  │
 │ Emplacement sur la carte  *        (obligatoire) │
 │ ℹ Touchez la carte pour placer le marqueur…      │
 │ ┌──────────────────────────────────────────────┐ │
 │ │                                              │ │
 │ │              🗺  Nouakchott                   │ │
 │ │                    📍 ← draggable            │ │
 │ │                                     [ ⟲ ]    │ │
 │ └──────────────────────────────────────────────┘ │
 │ 18.0735, −15.9582              [ Effacer ]       │
 └──────────────────────────────────────────────────┘
```

**Interaction:**

1. Map opens centred on Nouakchott (`18.0735, −15.9582`, zoom 12) with **no marker** and **no location permission prompt**.
2. Tap or click places the marker. The map does not recentre — the marker lands where the finger did.
3. The marker is draggable for fine adjustment. Long-press is not required.
4. A concise confirmation appears beneath the map after the marker is placed. Coordinates are not displayed or made editable; they remain internal to the form.
5. "Effacer" clears the marker and returns the field to invalid.
6. A reset control (`⟲`) returns the viewport to the default view without clearing the marker — the escape hatch for a user who pans away and gets lost.

**No forced geolocation.** `navigator.geolocation` is never called on mount. A "Utiliser ma position" button is explicitly V1.1 and must be user-initiated, with a graceful denial path.

---

## Admin Review Location Display

In the submission review modal, the Location block shows:

| Field | Presentation |
|---|---|
| Lieu du service | Plain text, `dir="auto"`, or `—` |
| Lieu proche | Plain text, `dir="auto"`, or `—` |
| Coordonnées | `tabular ltr-isolate`, 5 decimals, or "Non fournie" |
| Mini map | Read-only, marker at the submitted point, ~180 px tall |
| Ouvrir dans une carte | External link, same URL pattern as "Itinéraire" |

The admin needs to sanity-check that the pin is plausibly in Mauritania and matches the stated nearest place before approving. **Show the coordinates as text as well as on the map** — a reviewer can spot a transposed lat/lng pair or a `0,0` far faster from digits than from a pin.

Reuse the existing detail-modal shape from `AdminRequests`; the map is one more block inside it, lazily mounted when the modal opens so the admin list never loads map code.

---

## Mobile Layout (390px reference)

**Search sheet:**
- Bottom sheet, `rounded-t-3xl`, `max-h-[80vh]`, matching `InstallPromptModal` and `AdminModal`.
- Map fills a `h-[45vh]` block at the top; branch name and "Itinéraire" sit below in a fixed footer so the primary action never scrolls away.
- Sheet dismisses on Escape, overlay tap, and a close button ≥ 44×44 px.
- "Itinéraire" is full-width — the large tap target the brief asks for.

**Submission picker:**
- Map height `h-64` (256 px): tall enough to aim, short enough that the section header and helper text stay on screen while placing the pin.
- The map sits inside the normal scroll flow. **Critical:** a drag gesture starting on the map must pan the map, not scroll the page. Leaflet handles this via `touchAction`, but it must be verified on a real device — this is the single most common way an embedded mobile map feels broken.
- Marker confirmation and location actions sit beneath the map without revealing coordinate values.
- The sticky submit bar must not overlap the map; the page keeps its `pb-24`.

## Desktop Layout (1280px reference)

**Search:** a centred modal (`max-w-2xl`) rather than a side panel. A side panel would compete with the result list for attention; the map is a focused, transient check.

**Submission picker:** map spans the full width of the `max-w-3xl` form column at `h-80`. Coordinate readout moves inline to the end side of the row.

**Admin review:** map stays inside the existing modal at `h-48`. Do not widen the modal for it.

Both surfaces: mouse wheel zoom is **disabled by default** and enabled only after a click on the map (Leaflet's `scrollWheelZoom: 'center'` after focus, or a explicit enable-on-click). A map that swallows page scroll on hover is a well-known frustration.

---

## Copy FR / AR / EN

**Placement:** search-side copy → `src/i18n/{fr,ar,en}.ts` (member-facing). Submission-side copy → the `addBusiness` block from the DB4 design plan. Admin review copy → `adminCopy.ts`. Add every key to all three dictionaries in the same change; `Dictionary = typeof fr` enforces parity.

### Search result and map sheet

| Key | FR | AR | EN |
|---|---|---|---|
| `nearbyPlace` | Lieu proche | المكان القريب | Nearby place |
| `viewOnMap` | Voir sur la carte | عرض على الخريطة | View on map |
| `directions` | Itinéraire | الاتجاهات | Directions |
| `locationUnavailable` | Localisation exacte non disponible | الموقع الدقيق غير متوفر | Exact location unavailable |
| `mapSheetTitle` | Emplacement | الموقع | Location |
| `mapCloseLabel` | Fermer la carte | إغلاق الخريطة | Close the map |
| `mapLoading` | Chargement de la carte… | جارٍ تحميل الخريطة… | Loading the map… |
| `mapUnavailable` | La carte n'a pas pu être chargée. | تعذر تحميل الخريطة. | The map could not be loaded. |
| `openExternalMap` | Ouvrir dans une carte | فتح في الخرائط | Open in maps |
| `mainBranchMarker` | Agence principale | الوكالة الرئيسية | Main branch |

`directions` and `nearest` already exist under `demo.ui` in the dictionaries — **reuse those values, do not duplicate the keys**, and never rename them.

### Submission location section

| Key | FR | AR | EN |
|---|---|---|---|
| `locationSection` | Localisation | الموقع | Location |
| `serviceLocation` | Lieu du service | مكان الخدمة | Service location |
| `nearestPlace` | Lieu proche | المكان القريب | Nearby place |
| `mapPickerLabel` | Emplacement sur la carte | الموقع على الخريطة | Location on the map |
| `mapPickerHelper` | Touchez la carte pour placer le marqueur sur l'emplacement de votre service. | اضغط على الخريطة لوضع العلامة على موقع خدمتك. | Tap the map to place the marker on your service location. |
| `mapPickerRequired` | Veuillez sélectionner l'emplacement sur la carte. | يرجى تحديد الموقع على الخريطة. | Please select the location on the map. |
| `coordinatesLabel` | Coordonnées sélectionnées | الإحداثيات المحددة | Selected coordinates |
| `clearMarker` | Effacer | مسح | Clear |
| `resetView` | Recentrer la carte | إعادة توسيط الخريطة | Recentre the map |
| `noMarkerYet` | Aucun emplacement sélectionné | لم يتم تحديد موقع | No location selected |
| `markerPlaced` | Emplacement sélectionné | تم تحديد الموقع | Location selected |
| `optional` | Optionnel | اختياري | Optional |
| `required` | Obligatoire | إلزامي | Required |

### Admin review

| Key | FR | AR | EN |
|---|---|---|---|
| `location` | Localisation | الموقع | Location |
| `coordinates` | Coordonnées | الإحداثيات | Coordinates |
| `noCoordinates` | Non fournie | غير متوفرة | Not provided |
| `openInMaps` | Ouvrir dans une carte | فتح في الخرائط | Open in maps |

**Arabic note:** coordinates are Latin digits with a decimal point in every locale. Wrap them in `ltr-isolate` so a leading minus sign does not jump to the wrong side in RTL. Do not localise the digits — `formatNumber` uses `ar-u-nu-latn` for exactly this reason.

---

## Validation States

Applies to the submission picker only; the search map is read-only.

| State | Trigger | Presentation |
|---|---|---|
| Untouched | Form opened | Map with no marker. Helper text visible. Readout shows `noMarkerYet`. No error — an untouched required field is not an error yet |
| Valid | Marker placed | Readout shows coordinates + a subtle `markerPlaced` confirmation with a check icon. Any prior error clears immediately |
| Invalid on submit | Submit with no marker | `mapPickerRequired` beneath the map in `text-ask`; the map container gets an `border-ask` ring; **focus moves to the map container** so a keyboard user is taken to the problem |
| Cleared after valid | "Effacer" pressed | Returns to Untouched. Does **not** immediately show the error — clearing is a deliberate act, not a mistake |
| Out of plausible range | Marker outside Mauritania's bounding box (~14.7–27.3 N, −17.1–−4.8 E) | **Warning, not a block**: "Cet emplacement semble hors de Mauritanie." The user may be right; the server range constraint (±90/±180) is the only hard limit. Do not silently reject |

The map field participates in the same validate-on-submit, clear-on-fix cycle as every other field in the form — consistent with `AdminAddEstablishmentForm`.

Accessibility: the map container carries `role="application"`, an `aria-label` from `mapPickerLabel`, and `aria-describedby` pointing at the helper text; when invalid it also gets `aria-invalid="true"` and `aria-errormessage`. Because a tap-only map is not keyboard-operable, **a text fallback is required** — see Fallback States.

---

## Fallback States

| Condition | Search map | Submission picker |
|---|---|---|
| No coordinates on the record | Map buttons hidden entirely; show `locationUnavailable` as muted text. Lieu proche still shown if present | n/a |
| Map library/tiles fail to load | Buttons still render; sheet shows `mapUnavailable` plus a working "Itinéraire" link — directions never depend on tiles rendering | Keep the map error visible and allow the user to retry. Do not reveal coordinate inputs. |
| Offline | Sheet shows `mapUnavailable`; the external link still opens the maps app, which has its own offline handling | Keep the map error visible and allow the user to retry. Do not reveal coordinate inputs. |
| Slow tiles | Skeleton at the map's exact final height, so nothing reflows when tiles arrive | Same |
| Keyboard-only / screen reader user | Read-only; the coordinate text and external link carry the information | Pan and zoom with the map keyboard controls, then use “Place marker here” to select the current map centre. |
| `prefers-reduced-motion` | Disable Leaflet zoom/pan animation (`zoomAnimation: false`, `fadeAnimation: false`) | Same |

**No manual-coordinate fallback.** A map control plus an explicit keyboard action makes the mandatory marker selectable without exposing technical coordinate fields.

---

## Handoff Notes for OpenCode

### Two decisions the owner must make first

**1. Map library.** An interactive picker needs tile handling. `CLAUDE.md` and `agent/design-agent.md` both forbid adding a dependency without being asked, so this needs an explicit yes.

| Option | Size | Assessment |
|---|---|---|
| **Leaflet + OSM raster tiles** | ~42 kB gzip | **Recommended.** No API key, mature, stable touch handling, easy to disable animation. Must be lazy-loaded |
| MapLibre GL JS | ~200 kB gzip | Vector tiles and a style source; more than this feature needs |
| Hand-rolled tile grid | 0 kB | No dependency, but pinch-zoom, inertia and tile management are exactly the fiddly parts a library exists to solve. Not worth it for a mandatory field |

If Leaflet is approved, it **must** load in a lazily-imported chunk. The main bundle is already 728 kB (LOW-001 in the vulnerability report) and a landing visitor must never download map code.

**2. Tile provider.** OSM's public tile servers carry a usage policy that discourages production application traffic. Before launch, pick a provider (MapTiler or Stadia free tiers, or self-hosted) and put the tile URL in a `VITE_` variable — it is a public value, appropriate for the client, and lets the provider change without a code edit.

### The backend dependency (Phase M2)

Mandatory map selection needs coordinate columns that base DB4 does not have. **That amendment already exists in local source** — `supabase/migrations/20260821000003_db4_maps_location_support.sql`, written alongside this plan — and it covers the three things the feature requires:

```
business_submissions          + latitude / longitude, range-checked
create_business_submission    + p_latitude / p_longitude, rejected when null,
                                ranges validated server-side
admin_approve_business_submission
                              writes both into the created main branch
```

That last line is the point of the whole feature: coordinates must reach `branches`, or the approved business's own search result shows "Localisation exacte non disponible".

**What remains is deployment, not authoring.** Neither DB4 nor this amendment is applied to the remote project, and `MED-001` blocks pushing migrations at all. Sequence: reconcile MED-001 → apply DB4 → apply the coordinate amendment → then ship the picker.

**Until both are applied, do not make the picker mandatory in a deployed build.** Against a database without those columns the RPC call fails, or — worse, if only base DB4 is applied — the submission succeeds and silently drops the pin the user was forced to place. Either keep `/add-business` on its placeholder, or ship the location section without the map, until the schema is verified.

One detail worth a check when it is applied: the amendment declares plain `numeric`, while `branches` uses `numeric(10,7)`. Approval will round to 7 decimals (~1 cm), which is harmless — but confirm the rounding is acceptable rather than discovering it later.

### Recommended build order

1. **M1a** — `src/components/map/LewadMap.tsx`: one lazily-loaded component, props `{ mode: 'view' | 'pick', markers, onPick, center, zoom }`. Both surfaces use it; no second implementation.
2. **M1b** — `directionsUrl(lat, lng)` helper in `src/lib/maps.ts`, plus `hasCoordinates(branch)`. Pure functions, trivially testable.
3. **M1c** — Search result map buttons + bottom sheet. Frontend only; **ships now**.
4. **M1d** — Replace the `MockMap` placeholder in `AppDemo.tsx:108` with the real component.
5. **M2a** — Apply the existing coordinate amendment remotely (owner task, after MED-001 and after DB4 itself is applied). No new SQL to write.
6. **M2b** — Picker in the `/add-business` location section, with map click/tap, explicit current location, and the keyboard centre-selection action.
7. **M2c** — Admin review map block.

### Rules that carry over

- `src/lib/maps.ts` holds pure helpers only; no Supabase access, no component imports from it upward. This is `agent/clean-architecture-agent.md`'s dependency direction.
- All copy through `src/i18n/` or `adminCopy.ts` — never a string in a component.
- Logical properties only (`ms-`, `pe-`, `start-`, `end-`); coordinates and external links wrapped in `ltr-isolate`.
- No hardcoded colours — map chrome uses existing tokens. Leaflet's default CSS ships its own colours for controls and attribution; override them with token-based rules rather than accepting the library's palette in dark mode.
- Attribution is a licensing requirement, not a design choice. Keep the OSM/provider credit visible; style it down, never remove it.

### Privacy note

Coordinates of a **business** are public information by intent — that is the product. But the submission picker sits on a form that also carries the owner's personal phone. Do not log coordinates to the console, do not put them in a URL query string, and keep the existing rule that no user data reaches `console` outside `import.meta.env.DEV`.

---

## Not Implemented

No code, migration, RLS policy, RPC, Supabase configuration, or dependency was created or changed. Specifically not done:

- No map library added and no `package.json` change — that is the owner decision above.
- No `LewadMap` component, no `src/lib/maps.ts`, no directions helper.
- No change to `/app` search results; `MockMap` in `AppDemo.tsx` is untouched.
- No change to `/add-business`; it still renders its placeholder.
- No migration written or applied by this task. `…20260821000003_db4_maps_location_support.sql` was authored separately, in parallel with this plan; nothing here created or edited it, and it remains unapplied remotely.
- No geocoding, address search, "use my current location", routing engine, or Google Maps API integration — all explicitly out of V1 scope.
- No images or mockups.
