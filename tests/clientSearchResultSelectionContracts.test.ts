import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const searchUiPath = new URL("../src/components/AppDemo.tsx", import.meta.url);
const selectionPath = new URL(
  "../src/lib/clientSearchResults.ts",
  import.meta.url,
);
const paginationPath = new URL(
  "../src/components/ui/PaginationControls.tsx",
  import.meta.url,
);
const arabicCopyPath = new URL("../src/i18n/ar.ts", import.meta.url);
const searchMigrationPath = new URL(
  "../supabase/migrations/20260821000005_search_suggestions_and_arabic_support.sql",
  import.meta.url,
);

function source(path: URL) {
  return readFileSync(path, "utf8").replaceAll("\r\n", "\n");
}

describe("client search result selection contracts", () => {
  it("routes ambiguous and partial internal matches through a choice list", () => {
    const searchUi = source(searchUiPath);
    const selection = source(selectionPath);

    expect(searchUi).toContain("getAutoSelectedClientSearchResult(");
    expect(searchUi).toContain("rankClientSearchResults(");
    expect(searchUi).toContain("result.resultsCount,");
    expect(searchUi).toContain("setResultChoiceRequired(autoSelectedResult === null)");
    expect(searchUi).toContain("selectedResult ? (");
    expect(searchUi).toContain("<SearchResultChoices");
    expect(searchUi).toContain("onClick={() => onSelect(establishment)}");
    expect(selection).toContain("isGeographicClientSearchResult(result)");
    expect(selection).toContain("left.rank - right.rank || left.index - right.index");
  });

  it("paginates compact choices locally in groups of five", () => {
    const selection = source(selectionPath);
    const searchUi = source(searchUiPath);

    expect(selection).toContain("CLIENT_SEARCH_RESULTS_PER_PAGE = 5");
    expect(selection).toContain("results.slice(start, start + CLIENT_SEARCH_RESULTS_PER_PAGE)");
    expect(searchUi).toContain("getClientSearchResultPage(results, resultPage)");
    expect(searchUi).toContain("pagination.items.map");
    expect(searchUi).toContain("pagination.totalPages > 1");
    expect(searchUi).toContain("<PaginationControls");
    expect(searchUi).toContain("formatClientSearchChoiceLocation(primaryBranch)");
  });

  it("keeps selection and previous/next navigation free of paid searches", () => {
    const searchUi = source(searchUiPath);
    const selectStart = searchUi.indexOf("const selectSearchResult =");
    const mapChoiceStart = searchUi.indexOf("const searchResultQueryOnMap =");
    const returnStart = searchUi.indexOf("const returnToSearchResults =");
    const pageStart = searchUi.indexOf("const changeResultPage =");
    const renderStart = searchUi.indexOf("\n  return (", pageStart);

    expect(selectStart).toBeGreaterThan(-1);
    expect(mapChoiceStart).toBeGreaterThan(selectStart);
    expect(returnStart).toBeGreaterThan(selectStart);
    expect(pageStart).toBeGreaterThan(returnStart);
    expect(renderStart).toBeGreaterThan(pageStart);
    expect(searchUi.slice(selectStart, mapChoiceStart)).not.toContain("runSearch(");
    expect(searchUi.slice(pageStart, renderStart)).not.toContain("runSearch(");
    expect(searchUi.slice(selectStart, mapChoiceStart)).not.toContain(
      "searchServicesWithCredit",
    );
    expect(searchUi.slice(pageStart, renderStart)).not.toContain(
      "searchServicesWithCredit",
    );
    expect(searchUi.slice(selectStart, mapChoiceStart)).not.toContain(
      "runExternalSearch",
    );
    expect(searchUi.slice(pageStart, renderStart)).not.toContain("runExternalSearch");
  });

  it("offers an explicit map search for the immutable submitted query", () => {
    const searchUi = source(searchUiPath);
    const frenchCopy = source(new URL("../src/i18n/fr.ts", import.meta.url));
    const arabicCopy = source(arabicCopyPath);
    const englishCopy = source(new URL("../src/i18n/en.ts", import.meta.url));
    const mapChoiceStart = searchUi.indexOf("const searchResultQueryOnMap =");
    const returnStart = searchUi.indexOf("const returnToInternalResults =");
    const mapChoiceHandler = searchUi.slice(mapChoiceStart, returnStart);

    expect(mapChoiceStart).toBeGreaterThan(-1);
    expect(returnStart).toBeGreaterThan(mapChoiceStart);
    expect(searchUi).toContain("setResultQuery(requestedQuery)");
    expect(searchUi).toContain('id="client-search-map-choice"');
    expect(searchUi).toContain("searchCopy.searchQueryOnMap");
    expect(searchUi).toContain("shouldOfferClientSearchMapOption(");
    expect(searchUi).toContain("showMapSearch={resultMapChoiceAvailable}");
    expect(searchUi).toContain("{showMapSearch && (");
    expect(searchUi).toContain("<bdi dir=\"auto\">{query}</bdi>");
    expect(mapChoiceHandler).toContain('setExternalFallbackOrigin("explicit_choice")');
    expect(mapChoiceHandler).toContain("setExternalFallbackQuery(resultQuery)");
    expect(mapChoiceHandler).toContain("runExternalSearch(currentLocation, resultQuery, true)");
    expect(mapChoiceHandler).not.toContain("runSearch(");
    expect(mapChoiceHandler).not.toContain("searchServicesWithCredit");
    expect(searchUi).toContain("onClick={returnToInternalResults}");
    expect(searchUi).toContain("searchCopy.backToLewadResults");
    expect(searchUi).toContain("externalLocationFlowIdRef.current += 1");
    expect(searchUi).toContain(
      "if (locationRequestId !== locationRequestIdRef.current) return;",
    );
    expect(frenchCopy).toContain('searchQueryOnMap: "Rechercher « {query} » sur la carte"');
    expect(arabicCopy).toContain('searchQueryOnMap: "البحث عن «{query}» على الخريطة"');
    expect(englishCopy).toContain('searchQueryOnMap: "Search “{query}” on the map"');
  });

  it("invalidates abandoned map lookups without adding a paid-search path", () => {
    const searchUi = source(searchUiPath);
    const inputEditStart = searchUi.indexOf("const editSearchQuery =");
    const inputEditEnd = searchUi.indexOf("const applySuggestion", inputEditStart);
    const inputEditHandler = searchUi.slice(inputEditStart, inputEditEnd);

    expect(inputEditStart).toBeGreaterThan(-1);
    expect(inputEditHandler).toContain('if (state === "loading") return');
    expect(inputEditHandler).toContain("searchIdRef.current += 1");
    expect(inputEditHandler).toContain("externalSearchIdRef.current += 1");
    expect(inputEditHandler).toContain("externalLocationFlowIdRef.current += 1");
    expect(inputEditHandler).not.toContain("runSearch(");
    expect(inputEditHandler).not.toContain("searchServicesWithCredit");
    expect(searchUi).toContain("runExternalSearch(coordinates, fallbackQuery, true)");
    expect(searchUi).toContain("if (flowId !== externalLocationFlowIdRef.current) return");
    expect(searchUi).toContain('disabled={state === "loading"}');
  });

  it("ignores an abandoned missing-service request completion", () => {
    const searchUi = source(searchUiPath);
    const requestStart = searchUi.indexOf("const handleRequestMissingService =");
    const resetStart = searchUi.indexOf("const reset =", requestStart);
    const requestHandler = searchUi.slice(requestStart, resetStart);

    expect(requestStart).toBeGreaterThan(-1);
    expect(requestHandler).toContain("const requestedQuery = lastNotFoundQuery");
    expect(requestHandler).toContain("++missingServiceRequestIdRef.current");
    expect(requestHandler).toContain("query: requestedQuery");
    expect(requestHandler).toContain(
      "if (requestId !== missingServiceRequestIdRef.current) return",
    );
  });

  it("hydrates only approved paid-result metadata without changing the RPC", () => {
    const searchUi = source(searchUiPath);
    const dataLayer = source(new URL("../src/lib/db3a.ts", import.meta.url));

    expect(searchUi).toContain("await hydrateApprovedClientSearchPlaceTypes(");
    expect(dataLayer).toContain(".from('establishments')");
    expect(dataLayer).toContain(".select('id, place_types')");
    expect(dataLayer).toContain(".in('id', resultIds)");
    expect(dataLayer).toContain(".eq('status', 'approved')");
    expect(dataLayer).toContain("readPlaceTypeKeys(row.place_types)");
    expect(searchUi).toContain("t.superAdminServices.typeOptions[type]");
    expect(dataLayer.match(/search_services_with_credit/g)).toHaveLength(1);
    expect(dataLayer).not.toContain("credit_ledger");
    expect(dataLayer).not.toContain("external_place_discoveries");
  });

  it("starts external fallback only after a true internal not_found", () => {
    const searchUi = source(searchUiPath);
    const successIndex = searchUi.indexOf(
      'if (result.status === "success" && result.results.length)',
    );
    const notFoundGuardIndex = searchUi.indexOf(
      'if (result.status !== "not_found")',
    );
    const fallbackIndex = searchUi.indexOf(
      'setExternalFallbackState("askingLocation")',
    );

    expect(successIndex).toBeGreaterThan(-1);
    expect(notFoundGuardIndex).toBeGreaterThan(successIndex);
    expect(fallbackIndex).toBeGreaterThan(notFoundGuardIndex);
  });

  it("preserves the atomic server debit as the only point mutation", () => {
    const searchUi = source(searchUiPath);
    const migration = source(searchMigrationPath);

    expect(searchUi).toContain("await searchServicesWithCredit(requestedQuery)");
    expect(searchUi).toContain("applyWalletBalance(result.balance)");
    expect(searchUi).toContain("setDebited(result.debitedPoints === 1)");
    expect(migration).toMatch(/update\s+public\.wallets\s+set\s+balance\s*=\s*balance\s*-\s*1/i);
    expect(migration).toMatch(/insert\s+into\s+public\.credit_ledger\s*\(/i);
    expect(searchUi).not.toContain('.from("wallets")');
    expect(searchUi).not.toContain('.from("credit_ledger")');
  });

  it("keeps pagination mobile, RTL, and theme-token safe", () => {
    const pagination = source(paginationPath);

    expect(pagination).toContain("min-h-11");
    expect(pagination).toContain("grid grid-cols-2");
    expect(pagination).toContain("rtl:rotate-180");
    expect(pagination).toContain("border-line");
    expect(pagination).toContain("bg-surface");
    expect(pagination).not.toContain("bg-white");
    expect(pagination).not.toContain("text-gray");
    expect(pagination).toContain("disabled={disabled || page <= 1}");
    expect(pagination).toContain("disabled={disabled || page >= lastPage}");
    expect(pagination).not.toContain("focus:outline-none");
    expect(pagination).toContain("labels.navigation ??");
  });

  it("keeps choice summaries and selected details consistent", () => {
    const searchUi = source(searchUiPath);

    expect(searchUi).toContain(
      "const phone = establishment.phone ?? mainBranch?.phone ?? null;",
    );
    expect(searchUi).toContain(
      "const whatsapp = establishment.whatsapp ?? mainBranch?.whatsapp ?? null;",
    );
    expect(searchUi).toContain(
      'aria-label={`${searchCopy.backToResults}: ${selectedResult.name}`}',
    );
    expect(searchUi).toContain('<h2 dir="auto"');
  });

  it("includes clear Arabic result-choice copy and no frontend service role", () => {
    const searchUi = source(searchUiPath);
    const selection = source(selectionPath);
    const arabicCopy = source(arabicCopyPath);

    expect(arabicCopy).toContain("النتائج التي تم العثور عليها");
    expect(arabicCopy).toContain("اختر النتيجة التي تطابق بحثك.");
    expect(arabicCopy).toContain("لا توجد نتائج أخرى");
    expect(arabicCopy).toContain('page: "الصفحة"');
    expect(`${searchUi}\n${selection}`.toLowerCase()).not.toContain("service_role");
  });
});
