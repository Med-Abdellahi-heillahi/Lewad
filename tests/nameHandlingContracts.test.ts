import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The Lewad product brand is localized only in Arabic UI. Business/service
 * names (e.g. Bankily, Pharmacie Centrale) must not be converted to English or
 * Arabic equivalents — they are stored data, not translatable UI copy.
 *
 * Category/example labels (Pharmacie, Gym, etc.) may be localized normally.
 * Arabic may use `name_ar` when available, otherwise the original stored name.
 */

const localePaths = ["fr", "ar", "en"].map(
  (locale) => new URL(`../src/i18n/${locale}.ts`, import.meta.url),
);

const appDemoPath = new URL("../src/components/AppDemo.tsx", import.meta.url);
const appPagesPath = new URL("../src/components/AppPages.tsx", import.meta.url);
const authPagePath = new URL("../src/components/AuthPage.tsx", import.meta.url);
const logoPath = new URL("../src/components/Logo.tsx", import.meta.url);
const navbarPath = new URL("../src/components/Navbar.tsx", import.meta.url);
const appBarPath = new URL("../src/components/shell/AppBar.tsx", import.meta.url);
const appShellPath = new URL("../src/components/shell/AppShell.tsx", import.meta.url);
const appNavPath = new URL("../src/components/shell/appNav.ts", import.meta.url);
const historyPagePath = new URL(
  "../src/components/HistoryPage.tsx",
  import.meta.url,
);
const searchSuggestionsPath = new URL(
  "../src/lib/searchSuggestions.ts",
  import.meta.url,
);
const userHistoryPath = new URL("../src/lib/userHistory.ts", import.meta.url);
const contentPath = new URL("../src/lib/content.ts", import.meta.url);

function read(url: URL) {
  return readFileSync(url, "utf8").replaceAll("\r\n", "\n");
}

function latinBrandStringValues(source: string) {
  return source.match(/["'][^"'\n]*Lewad[^"'\n]*["']/g) ?? [];
}

describe("brand name contracts", () => {
  it("centralizes Lewad in French and English and لواد in Arabic", () => {
    expect(read(localePaths[0])).toContain('brandName: "Lewad"');
    expect(read(localePaths[1])).toContain('brandName: "لواد"');
    expect(read(localePaths[2])).toContain('brandName: "Lewad"');
  });

  it("renders the localized key in shared brand surfaces", () => {
    const logo = read(logoPath);
    const navbar = read(navbarPath);
    const auth = read(authPagePath);
    const appBar = read(appBarPath);
    const appShell = read(appShellPath);

    expect(logo).toContain("{t.brandName}");
    expect(logo).toContain('<bdi dir="auto"');
    expect(logo).not.toContain(">LEWAD<");
    expect(navbar).toContain("aria-label={t.brandName}");
    expect(navbar).toContain("title={t.brandName}");
    expect(auth).toContain("aria-label={t.brandName}");
    expect(auth).toContain("`${screenTitle} — ${t.brandName}`");
    expect(appBar).toContain("aria-label={t.brandName}");
    expect(appShell).toContain("`${documentTitle} — ${t.brandName}`");
  });

  it("uses لواد throughout Arabic product-brand copy", () => {
    const arabicDictionary = read(localePaths[1]);
    expect(arabicDictionary).toContain("لواد");
    expect(latinBrandStringValues(arabicDictionary)).toEqual([]);

    const files = [
      { path: appDemoPath, name: "AppDemo.tsx" },
      { path: appPagesPath, name: "AppPages.tsx" },
      { path: authPagePath, name: "AuthPage.tsx" },
      { path: appNavPath, name: "appNav.ts" },
    ];

    for (const { path, name } of files) {
      const src = read(path);
      const start = src.indexOf("  ar: {");
      const end = src.indexOf("  en: {", start);
      const arSection = src.slice(start, end);

      expect(start, `${name} exposes an Arabic copy block`).toBeGreaterThan(-1);
      expect(end, `${name} exposes an English copy block after Arabic`).toBeGreaterThan(start);
      expect(arSection, `${name} keeps the Arabic product brand localized`).toContain("لواد");
      expect(
        latinBrandStringValues(arSection),
        `${name} has no Latin product brand in Arabic UI`,
      ).toEqual([]);
    }

  });
});

describe("proper name non-translation contracts", () => {
  it("DB-backed starter chips render the canonical stored name in every locale", () => {
    const appDemo = read(appDemoPath);
    const sectionStart = appDemo.indexOf(
      "{approvedSuggestions.length > 0 && (",
    );
    const sectionEnd = appDemo.indexOf('aria-live={', sectionStart);
    const section = appDemo.slice(sectionStart, sectionEnd);

    expect(sectionStart).toBeGreaterThan(-1);
    expect(section).toContain("approvedSuggestions.map((suggestion)");
    expect(section).toContain("{suggestion.name}");
    expect(section).not.toContain("suggestion.nameAr");
    expect(section).not.toContain('locale === "ar"');
  });

  it("starter suggestions never hardcode or transliterate a business name", () => {
    const appDemo = read(appDemoPath);

    expect(appDemo).not.toContain("chips:");
    expect(appDemo).not.toContain("Bankily");
    expect(appDemo).not.toContain("بنكيلي");
    expect(appDemo).toContain("getApprovedServiceSuggestions");
  });

  it("Arabic query placeholder stays generic instead of naming demo data", () => {
    const appDemo = read(appDemoPath);

    const arPlaceholderMatch = appDemo.match(
      /ar:\s*\{[\s\S]*?placeholder:\s*["'](.*?)["']/,
    );
    expect(arPlaceholderMatch).not.toBeNull();
    expect(arPlaceholderMatch![1]).toBe("اسم مؤسسة أو مكان…");
    expect(arPlaceholderMatch![1]).not.toContain("Bankily");
    expect(arPlaceholderMatch![1]).not.toContain("بنكيلي");
  });

  it("English demo suggestions are category labels, not translated business names", () => {
    // The suggestions array lives in the locale dictionaries under demo.ui.suggestions.
    // They are category labels (Gym, Pharmacy, Supermarket) — not business names.
    // Category labels may be localized normally.
    const en = read(localePaths[2]);

    const match = en.match(/suggestions:\s*\[(.*?)\]/);
    expect(match, "suggestions not found in en.ts").not.toBeNull();
    const enSuggestions = match![1];

    expect(enSuggestions).toContain("Gym");
    expect(enSuggestions).toContain("Pharmacy");
    expect(enSuggestions).toContain("Supermarket");
  });
});

describe("history name non-translation contracts", () => {
  it("history searchedFor template keeps the query unchanged inside translated sentence", () => {
    for (const path of localePaths) {
      const src = read(path);

      // Extract the history.searchedFor value.
      const match = src.match(/searchedFor:\s*["'](.*?)["']/);
      expect(match, `searchedFor not found in ${path.pathname}`).not.toBeNull();

      // The template must contain a {query} placeholder — the actual name
      // is inserted at runtime and must never be translated client-side.
      expect(match![1]).toContain("{query}");
    }
  });

  it("history businessAsked template keeps the business name unchanged", () => {
    for (const path of localePaths) {
      const src = read(path);

      const match = src.match(/businessAsked:\s*["'](.*?)["']/);
      expect(match, `businessAsked not found in ${path.pathname}`).not.toBeNull();

      expect(match![1]).toContain("{name}");
    }
  });

  it("history page renders subject as-is via template replacement", () => {
    const page = read(historyPagePath);

    // The searchedFor line must use .replace("{query}", event.subject),
    // not translate the subject.
    expect(page).toContain('copy.searchedFor.replace("{query}", event.subject)');
    expect(page).toContain(
      'copy.businessAsked.replace("{name}", event.subject)',
    );
  });

  it("user history layer stores and passes subject verbatim", () => {
    const source = read(userHistoryPath);

    // The subject field is the raw query or business name from the database.
    // It must be carried as-is, never transformed or translated.
    expect(source).toContain("subject: stringValue(row.query)");
    expect(source).toContain("subject: stringValue(row.business_name_fr)");
    expect(source).toContain(
      "/** Terme recherché ou nom d'établissement, affiché tel quel. */",
    );
  });
});

describe("search results name contracts", () => {
  it("search suggestions carry name and nameAr but no translation logic", () => {
    const source = read(searchSuggestionsPath);

    // Suggestions return raw name and optional nameAr from the database.
    expect(source).toContain("name: string");
    expect(source).toContain("nameAr: string | null");

    // No client-side translation logic.
    expect(source).not.toContain("translate");
    expect(source).not.toContain("localize");
    expect(source).not.toContain("convert");
  });

  it("AppDemo uses nameAr for Arabic locale, falls back to name", () => {
    const source = read(appDemoPath);

    // The suggestion label selection logic.
    expect(source).toContain('locale === "ar"');
    expect(source).toContain("suggestion.nameAr ?? suggestion.name");
  });

  it("search results display establishment.name directly, no translation", () => {
    const source = read(appDemoPath);

    // Establishment names are rendered from the DB field directly.
    expect(source).toContain("{establishment.name}");
    expect(source).toContain("{branch.name}");

    // No translation function wraps the name.
    expect(source).not.toMatch(/translate\(.*\.name/);
    expect(source).not.toMatch(/localize\(.*\.name/);
  });

  it("external place results preserve the provider's display name and address", () => {
    const source = read(appDemoPath);
    const start = source.indexOf('{externalPlace.displayName}');
    const section = source.slice(start, source.indexOf('</div>', start));

    expect(start).toBeGreaterThan(-1);
    expect(section).toContain('{externalPlace.displayName}');
    expect(section).toContain('{externalPlace.address}');
    expect(section).not.toMatch(/translate\(.*externalPlace/);
    expect(section).not.toMatch(/localize\(.*externalPlace/);
  });

  it("content.ts demo data uses stored names, not translated labels", () => {
    const source = read(contentPath);

    // Demo establishments use real-style names like "Bankily", "Sedad", etc.
    expect(source).toContain("name: 'Bankily'");
    expect(source).toContain("name: 'Sedad'");
    expect(source).toContain("name: 'Pharmacie Centrale'");
    expect(source).toContain("name: 'Restaurant Salam'");

    // Category names are in French (the primary content language), not translated.
    expect(source).toContain("name: 'Services financiers'");
    expect(source).toContain("name: 'Santé'");
    expect(source).toContain("name: 'Sport'");
  });
});
