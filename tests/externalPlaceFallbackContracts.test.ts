import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildGeocodeQueries,
  matchesGeocodeCandidate,
  runProviderFallbackChain,
} from "../supabase/functions/geocode-place/geocodeQuery";
import { MAURITANIA_WILAYAS } from "../src/lib/searchLocationContext";

const searchUiPath = new URL("../src/components/AppDemo.tsx", import.meta.url);
const dataLayerPath = new URL("../src/lib/externalPlaceSearch.ts", import.meta.url);
const edgeFunctionPath = new URL(
  "../supabase/functions/geocode-place/index.ts",
  import.meta.url,
);
const migrationPath = new URL(
  "../supabase/migrations/20260821000009_external_place_discovery.sql",
  import.meta.url,
);
const photonMigrationPath = new URL(
  "../supabase/migrations/20260826000012_allow_photon_external_place_discoveries.sql",
  import.meta.url,
);
const adminReviewMigrationPath = new URL(
  "../supabase/migrations/20260826000013_admin_external_place_review_actions.sql",
  import.meta.url,
);
const importTypesMigrationPath = new URL(
  "../supabase/migrations/20260826000014_external_place_import_types.sql",
  import.meta.url,
);
const uniqueImportRpcMigrationPath = new URL(
  "../supabase/migrations/20260826000015_rename_external_place_import_rpc.sql",
  import.meta.url,
);
const uniqueImportRpcFixMigrationPath = new URL(
  "../supabase/migrations/20260826000016_fix_external_place_import_rpc_coalesce.sql",
  import.meta.url,
);
const accountHookPath = new URL("../src/hooks/useDb1Account.ts", import.meta.url);
const appShellPath = new URL("../src/components/shell/AppBar.tsx", import.meta.url);
const placeTypesPath = new URL("../src/lib/placeTypes.ts", import.meta.url);
const frenchCopyPath = new URL("../src/i18n/fr.ts", import.meta.url);
const arabicCopyPath = new URL("../src/i18n/ar.ts", import.meta.url);
const englishCopyPath = new URL("../src/i18n/en.ts", import.meta.url);
const adminUiPath = new URL("../src/components/AdminPage.tsx", import.meta.url);
const adminDataPath = new URL("../src/lib/admin.ts", import.meta.url);
const adminCopyPath = new URL("../src/components/admin/adminCopy.ts", import.meta.url);

function source(path: URL) {
  return readFileSync(path, "utf8").replaceAll("\r\n", "\n");
}

describe("external place fallback contracts", () => {
  it("keeps the paid Lewad search first and only starts map fallback after not_found", () => {
    const searchUi = source(searchUiPath);
    const paidSearchIndex = searchUi.indexOf(
      "await searchServicesWithCredit(requestedQuery)",
    );
    const notFoundGuardIndex = searchUi.indexOf('if (result.status !== "not_found")');
    const mapFallbackIndex = searchUi.indexOf(
      'setExternalFallbackState("askingLocation")',
    );

    expect(paidSearchIndex).toBeGreaterThan(-1);
    expect(notFoundGuardIndex).toBeGreaterThan(paidSearchIndex);
    expect(mapFallbackIndex).toBeGreaterThan(notFoundGuardIndex);
    expect(searchUi).toContain('if (result.status === "success" && result.results.length)');
    expect(searchUi).toContain("response = await searchExternalPlace({");
  });

  it("asks for location early only from an explicit client action and falls back to wilaya", () => {
    const searchUi = source(searchUiPath);
    const handlerStart = searchUi.indexOf("const requestCurrentLocation = (");
    const handlerEnd = searchUi.indexOf(
      "\n  const requestLocationForSearchContext",
      handlerStart,
    );

    expect(handlerStart).toBeGreaterThan(-1);
    expect(handlerEnd).toBeGreaterThan(handlerStart);
    expect(searchUi.slice(0, handlerStart)).not.toContain(
      "navigator.geolocation.getCurrentPosition",
    );
    expect(searchUi.slice(handlerStart, handlerEnd)).toContain(
      "navigator.geolocation.getCurrentPosition",
    );
    expect(searchUi).toContain("locationPromptVisible");
    expect(searchUi).toContain("searchCopy.initialLocationPrompt");
    expect(searchUi).toContain("onClick={requestLocationForSearchContext}");
    expect(searchUi).toContain("onClick={dismissInitialLocationPrompt}");
    expect(searchUi).toContain("setSearchLocationPickerOpen(true)");
    expect(searchUi).toContain("!hasUnlimitedSearches &&");
    expect(searchUi).toContain("searchCopy.searchingMaps");
    expect(searchUi).toContain("if (import.meta.env.DEV)");
    expect(searchUi).toContain("[location-fallback]");
  });

  it("shows and preserves a pre-search wilaya context for the geocoding payload", () => {
    const searchUi = source(searchUiPath);
    const dataLayer = source(dataLayerPath);

    expect(MAURITANIA_WILAYAS).toHaveLength(15);
    expect(searchUi).toContain('id="search-context-wilaya"');
    expect(searchUi).toContain("{searchContextMessage}");
    expect(searchUi).toContain("searchCopy.changeWilaya");
    expect(searchUi).toContain("saveSearchWilaya(wilaya || null)");
    expect(searchUi).toContain("wilaya: selectedWilaya || null");
    expect(dataLayer).toContain('country: "Mauritania" as const');
    expect(searchUi).toContain("location,");

    const clearStateStart = searchUi.indexOf("const clearSearchState = () => {");
    const clearStateEnd = searchUi.indexOf("\n  const runSearch", clearStateStart);
    expect(searchUi.slice(clearStateStart, clearStateEnd)).not.toContain(
      "setSelectedWilaya",
    );
  });

  it("uses the protected edge-function boundary and handles errors visibly without frontend secrets", () => {
    const searchUi = source(searchUiPath);
    const dataLayer = source(dataLayerPath);
    const edgeFunction = source(edgeFunctionPath);

    expect(dataLayer).toContain('supabase.functions.invoke("geocode-place"');
    expect(dataLayer).toContain("console.debug");
    expect(dataLayer).toContain("if (import.meta.env.DEV)");
    expect(dataLayer).toContain('country: "Mauritania" as const');
    expect(dataLayer).not.toContain("NOMINATIM_USER_AGENT");
    expect(dataLayer).not.toContain("SERVICE_ROLE");
    expect(dataLayer).not.toMatch(/GOOGLE(?:_MAPS)?_API_KEY/);
    expect(searchUi).toContain('externalFallbackState === "error"');
    expect(searchUi).toContain("searchCopy.mapSearchError");
    expect(searchUi).toContain('state === "externalFound" && externalPlace');
    expect(searchUi).toContain("searchCopy.mapResultSaveWarning");
    expect(edgeFunction).toContain('Deno.env.get("NOMINATIM_USER_AGENT")');
    expect(edgeFunction).toContain('const PHOTON_BASE_URL = "https://photon.komoot.io/api/"');
    expect(edgeFunction).toContain('providerBaseUrl?.protocol !== "https:"');
    expect(edgeFunction).toContain(
      'geocodingUrl.searchParams.set("countrycodes", "mr")',
    );
    expect(edgeFunction).toContain("buildGeocodeQueries(query, wilaya)");
    expect(edgeFunction).toContain("NOMINATIM_RETRY_DELAY_MS");
    expect(edgeFunction).toContain('body.country !== "Mauritania"');
    expect(edgeFunction).toContain("distanceFromLocation(first, location)");
    expect(edgeFunction).toContain('"reserve_external_place_lookup"');
    expect(edgeFunction).not.toContain("SERVICE_ROLE");
    expect(edgeFunction).not.toMatch(/GOOGLE(?:_MAPS)?_API_KEY/);
  });

  it("tries Photon before Nominatim and keeps Nominatim as the fallback", () => {
    const edgeFunction = source(edgeFunctionPath);

    expect(edgeFunction).toContain("runProviderFallbackChain(");
    expect(edgeFunction.indexOf("? await searchPhoton(")).toBeGreaterThan(-1);
    expect(edgeFunction.indexOf("? await searchNominatim(")).toBeGreaterThan(
      edgeFunction.indexOf("? await searchPhoton("),
    );
    expect(edgeFunction).toContain('provider: "photon"');
    expect(edgeFunction).toContain('provider: "nominatim"');
    expect(edgeFunction).toContain('reason: "no_valid_candidate"');
    expect(edgeFunction).toContain('reason: providerResult.stage');
    expect(edgeFunction).not.toContain('return errorResponse("error", nominatim.stage');
    expect(edgeFunction).toContain('selectCandidates(candidates, query, location, "photon")');
    expect(edgeFunction).toContain('selectCandidates(data, query, location, "nominatim")');
    expect(edgeFunction).toContain('p_provider: provider');
  });

  it("continues through no-result, invalid, and fetch-error Photon attempts before Nominatim", async () => {
    const calls: string[] = [];
    const selected = await runProviderFallbackChain(
      ["Kiffa, Assaba, Mauritania", "Kiffa, Mauritania"],
      async (provider, attempt) => {
        calls.push(`${provider}:${attempt}`);
        if (provider === "photon" && attempt === "context") throw new Error("fetch failed");
        if (provider === "photon") return null; // no valid candidate after normalization
        if (attempt === "context") return null; // Nominatim no result
        return "Kiffa كيفة";
      },
    );

    expect(calls).toEqual([
      "photon:context",
      "photon:country_fallback",
      "nominatim:context",
      "nominatim:country_fallback",
    ]);
    expect(selected).toEqual({ provider: "nominatim", candidate: "Kiffa كيفة" });
  });

  it("builds Kiffa and ordinary establishment geographic attempts", () => {
    expect(buildGeocodeQueries("Kiffa", "Assaba")).toEqual([
      "Kiffa, Assaba, Mauritania",
      "Kiffa, Mauritania",
    ]);
    expect(buildGeocodeQueries("Kiffa", null)).toEqual([
      "Kiffa, Mauritania",
    ]);
    expect(buildGeocodeQueries("Fun City", "Nouakchott Ouest")).toEqual([
      "Fun City, Nouakchott Ouest, Mauritania",
      "Fun City, Mauritania",
    ]);
    expect(buildGeocodeQueries("Hotel Sahra", null)).toEqual([
      "Hotel Sahra, Mauritania",
    ]);
    expect(
      matchesGeocodeCandidate(
        "Kiffa",
        "Kiffa Department",
        "Kiffa Department, Assaba, Mauritania",
      ),
    ).toBe(true);
    expect(
      matchesGeocodeCandidate(
        "Kiffa",
        "Kiffa كيفة",
        "Kiffa كيفة, Assaba العصابة, Mauritanie موريتانيا",
      ),
    ).toBe(true);
    expect(
      matchesGeocodeCandidate("Kiffa", "Kaedi", "Kaedi, Gorgol, Mauritania"),
    ).toBe(false);
  });

  it("saves only pending discoveries, rate-limits lookup calls, and never creates establishments", () => {
    const migration = source(migrationPath);
    const photonMigration = source(photonMigrationPath);

    expect(migration).toContain(
      "create table if not exists public.external_place_discoveries",
    );
    expect(migration).toContain("source_status text not null default 'pending_review'");
    expect(migration).toContain("create_external_place_discovery");
    expect(migration).toContain("reserve_external_place_lookup");
    expect(migration).toContain("admin_review_external_place_discovery");
    expect(migration).toContain("if not public.is_admin() then");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("'rate_limited'");
    expect(migration).toContain(
      "Users can read their own external place discoveries",
    );
    expect(migration).toContain("Admins can read external place discoveries");
    expect(migration).toContain(
      "revoke all on table public.external_place_discoveries from public, anon, authenticated;",
    );
    expect(migration).not.toContain("insert into public.establishments");
    expect(migration).not.toContain("update public.wallets");
    expect(migration).not.toContain("public.credit_ledger");
    expect(photonMigration).toContain("check (provider in ('photon', 'nominatim'))");
    expect(photonMigration).toContain("v_provider not in ('photon', 'nominatim')");
    expect(photonMigration).toContain("'pending_review'");
    expect(photonMigration).not.toContain("insert into public.establishments");
    expect(photonMigration).not.toContain("update public.wallets");
  });

  it("keeps the client balance on the atomic server result and prevents stale wallet reads from overwriting it", () => {
    const searchUi = source(searchUiPath);
    const accountHook = source(accountHookPath);
    const appShell = source(appShellPath);

    const refreshIndex = searchUi.indexOf("await refresh();");
    const paidSearchIndex = searchUi.indexOf("await searchServicesWithCredit(requestedQuery)");
    const applyIndex = searchUi.indexOf("applyWalletBalance(result.balance)");

    expect(refreshIndex).toBeGreaterThan(-1);
    expect(paidSearchIndex).toBeGreaterThan(refreshIndex);
    expect(applyIndex).toBeGreaterThan(paidSearchIndex);
    expect(searchUi).not.toContain("void refresh();");
    expect(accountHook).toContain("const walletRevision = useRef(0)");
    expect(accountHook).toContain("walletRevision.current !== walletRevisionAtStart");
    expect(accountHook).toContain("walletRevision.current += 1");
    expect(appShell).toContain("const { user, isAuthenticated, profile, wallet");
    expect(appShell).toContain("formatNumber(wallet.balance, locale)");
  });

  it("keeps client discovery handling separate from the admin review actions", () => {
    const searchUi = source(searchUiPath);
    const adminUi = source(adminUiPath);
    const adminData = source(adminDataPath);
    const adminReviewMigration = source(adminReviewMigrationPath);

    expect(searchUi).toContain("searchCopy.mapResultSaveWarning");
    expect(searchUi).not.toContain("pendingVerification");
    expect(searchUi).not.toContain("savedForReview");
    expect(searchUi).not.toContain("resultFoundFromMap");
    expect(adminUi).toContain("AdminDiscoveriesView");
    expect(adminUi).toContain("{ id: 'discoveries', icon: MapPinned }");
    expect(adminData).toContain("getAdminExternalPlaceDiscoveries");
    expect(adminData).toContain(".from('external_place_discoveries')");
    expect(adminData).toContain("adminImportExternalPlaceDiscovery");
    expect(adminData).toContain("adminRejectExternalPlaceDiscovery");
    expect(adminData).toContain("admin_import_external_place_discovery_with_types");
    expect(adminData).toContain("admin_reject_external_place_discovery");
    expect(adminData).not.toContain("SERVICE_ROLE");
    expect(adminUi).toContain("copy.importAction");
    expect(adminUi).toContain("copy.rejectAction");
    expect(adminUi).toContain("onReview={reviewDiscovery}");
    expect(adminReviewMigration).toContain("admin_import_external_place_discovery_as_establishment");
    expect(adminReviewMigration).toContain("admin_reject_external_place_discovery");
    expect(adminReviewMigration).toContain("if not public.is_admin() then");
    expect(adminReviewMigration).toContain("insert into public.establishments");
    expect(adminReviewMigration).toContain("insert into public.branches");
    expect(adminReviewMigration).toContain("imported_establishment_id");
    expect(adminReviewMigration).toContain("set source_status = 'imported'");
    expect(adminReviewMigration).toContain("set source_status = 'rejected'");
    expect(adminReviewMigration).toContain("pg_advisory_xact_lock");
    expect(adminReviewMigration).toContain("insert into public.admin_audit_events");
    expect(adminReviewMigration).toContain("revoke all on function public.admin_import_external_place_discovery_as_establishment(uuid) from public, anon;");
    expect(adminReviewMigration).toContain("select pg_notify('pgrst', 'reload schema');");
    expect(adminReviewMigration).not.toContain('pg_catalog.trim(');
    expect(adminReviewMigration).not.toMatch(/trim\(\s*both\s+'-'/);
    expect(adminReviewMigration).toContain("v_slug_base := btrim(");
    expect(adminReviewMigration).toContain("pg_catalog.hashtext('admin_create_establishment:' || v_slug_base)::bigint");
    expect(adminReviewMigration).toMatch(/pg_catalog\.hashtext\([\s\S]*?provider_place_id\s*\)\s*::bigint/);
    expect(source(adminCopyPath)).toContain("pending_review: 'en attente'");
  });

  it("requires one or more stable place types before an administrator can import a discovery", () => {
    const adminUi = source(adminUiPath);
    const adminData = source(adminDataPath);
    const placeTypes = source(placeTypesPath);
    const importTypesMigration = source(importTypesMigrationPath);
    const uniqueImportRpcMigration = source(uniqueImportRpcMigrationPath);
    const uniqueImportRpcFixMigration = source(uniqueImportRpcFixMigrationPath);

    for (const key of [
      'establishment', 'company', 'region', 'moughataa', 'wilaya',
      'sports_hall', 'restaurant', 'hall', 'administration', 'private', 'public',
    ]) {
      expect(placeTypes).toContain(`'${key}'`);
      expect(importTypesMigration).toContain(`'${key}'`);
    }

    expect(adminUi).toContain('copy.chooseTypeTitle');
    expect(adminUi).toContain('PLACE_TYPE_KEYS.map');
    expect(adminUi).toContain('type="checkbox"');
    expect(adminUi).toContain('current.includes(type)');
    expect(adminUi).toContain(': [...current, type]');
    expect(adminUi).toContain("selectedTypes.length === 0");
    expect(adminUi).toContain('setTypeError(true)');
    expect(adminUi).toContain('copy.chooseTypeError');
    expect(adminUi).toContain('copy.confirmImport');
    expect(adminUi).toContain('adminImportExternalPlaceDiscovery(discovery.id, selectedTypes)');
    expect(adminData).toContain("'admin_import_external_place_discovery_with_types'");
    expect(adminData).not.toContain("'admin_import_external_place_discovery_as_establishment'");
    expect(adminData).toContain('? { p_discovery_id: discoveryId, p_selected_types: selectedTypes }');
    expect(adminData).toContain('p_selected_types: selectedTypes');
    expect(adminData).toContain("console.error('Admin external-place import RPC failed'");
    expect(adminData).toContain('httpStatus: status');
    expect(adminData).toContain('errorCode: error.code');
    expect(adminData).toContain('import.meta.env.DEV');
    expect(adminData).not.toContain('SERVICE_ROLE');

    expect(importTypesMigration).toContain("add column if not exists place_types text[] not null default '{}'::text[];");
    expect(importTypesMigration).toContain('establishments_place_types_allowed_check');
    expect(uniqueImportRpcMigration).toContain("create or replace function public.admin_import_external_place_discovery_with_types(\n  p_discovery_id uuid,\n  p_selected_types text[]\n)");
    expect(uniqueImportRpcMigration).toContain("'status', 'invalid_types'");
    expect(uniqueImportRpcMigration).toContain("pg_catalog.cardinality(v_selected_types) = 0");
    expect(uniqueImportRpcMigration).toContain('v_selected_types <@ array[');
    expect(uniqueImportRpcMigration).toContain('set place_types = (');
    expect(uniqueImportRpcMigration).toContain('admin_import_external_place_discovery_as_establishment(p_discovery_id)');
    expect(uniqueImportRpcMigration).toContain('grant execute on function public.admin_import_external_place_discovery_with_types(uuid, text[]) to authenticated;');
    expect(uniqueImportRpcMigration).toContain("select pg_notify('pgrst', 'reload schema');");
    expect(uniqueImportRpcFixMigration).toContain("create or replace function public.admin_import_external_place_discovery_with_types(\n  p_discovery_id uuid,\n  p_selected_types text[]\n)");
    expect(uniqueImportRpcFixMigration).toContain("pg_catalog.unnest(coalesce(p_selected_types, '{}'::text[]))");
    expect(uniqueImportRpcFixMigration).not.toContain('pg_catalog.coalesce(');
    expect(uniqueImportRpcFixMigration).toContain('grant execute on function public.admin_import_external_place_discovery_with_types(uuid, text[]) to authenticated;');
    expect(uniqueImportRpcFixMigration).toContain("select pg_notify('pgrst', 'reload schema');");
    expect(importTypesMigration).toContain('revoke all on function public.admin_import_external_place_discovery_as_establishment(uuid) from public, anon, authenticated;');
    expect(importTypesMigration).toContain('grant execute on function public.admin_import_external_place_discovery_as_establishment(uuid, text[]) to authenticated;');
  });

  it("provides location, context, result, and error copy in every language", () => {
    const frenchCopy = source(frenchCopyPath);
    const arabicCopy = source(arabicCopyPath);
    const englishCopy = source(englishCopyPath);

    expect(frenchCopy).toContain(
      "Lewad peut utiliser votre position pour chercher les services autour de vous.",
    );
    expect(frenchCopy).toContain(
      "La recherche sera effectuée dans la wilaya : {wilaya}.",
    );
    expect(frenchCopy).toContain(
      "Impossible de chercher sur la carte pour le moment. Réessayez.",
    );
    expect(frenchCopy).toContain("Le résultat est affiché, mais il n’a pas pu être enregistré pour le moment.");
    expect(frenchCopy).not.toContain("En attente de vérification");
    expect(frenchCopy).not.toContain("Lewad va le vérifier");
    expect(arabicCopy).toContain(
      "يمكن لـ Lewad استخدام موقعك للبحث عن الخدمات القريبة منك.",
    );
    expect(arabicCopy).toContain("سيتم البحث في الولاية: {wilaya}.");
    expect(arabicCopy).toContain("تعذر البحث على الخريطة الآن. حاول مرة أخرى.");
    expect(arabicCopy).toContain("داخلت نواذيبو");
    expect(arabicCopy).toContain("تم عرض النتيجة، لكن تعذر حفظها حاليًا.");
    expect(arabicCopy).not.toContain("سيقوم Lewad بالتحقق منها");
    expect(englishCopy).toContain(
      "Lewad can use your location to search for services near you.",
    );
    expect(englishCopy).toContain("Search will be performed in: {wilaya}.");
    expect(englishCopy).toContain(
      "Could not search the map right now. Please try again.",
    );
    expect(englishCopy).toContain("The result is shown, but could not be saved right now.");
    expect(englishCopy).not.toContain("Pending verification");
    expect(englishCopy).not.toContain("Lewad will verify it");
  });
});
