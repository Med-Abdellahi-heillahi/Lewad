import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Proper names and brand names must never be translated by the i18n layer.
 *
 * "Lewad" must stay "Lewad" in all three languages. Business/service names
 * (e.g. Bankily, Pharmacie Centrale) must not be converted to English or
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

describe("brand name contracts", () => {
  it("Lewad remains Lewad in all three locale dictionaries", () => {
    for (const path of localePaths) {
      const src = read(path);

      // The Latin brand name must appear in every locale.
      expect(src).toContain("Lewad");

      // Arabic must not use the transliterated form in active i18n values.
      // Only comments about the logo file may reference it.
      if (path.pathname.includes("/ar.")) {
        // Extract only value strings (inside quotes), skip comments.
        const valueLines = src
          .split("\n")
          .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"));

        for (const line of valueLines) {
          // Match Arabic-transliterated Lewad inside string values.
          const matches = line.match(/['"](.*? لواد .*?)['"]/g) ?? [];
          for (const match of matches) {
            throw new Error(
              `Arabic dictionary contains transliterated "لواد" in value: ${match}`,
            );
          }
        }
      }
    }
  });

  it("Lewad is never translated in component-level Arabic copy", () => {
    const files = [
      { path: appDemoPath, name: "AppDemo.tsx" },
      { path: appPagesPath, name: "AppPages.tsx" },
      { path: appPagesPath, name: "appNav.ts" },
    ];

    for (const { path, name } of files) {
      const src = read(path);
      // Find Arabic string values that contain the transliterated form.
      const arSection = src.includes("ar:")
        ? src.slice(src.indexOf("ar:"), src.indexOf("ar:") + 5000)
        : src;
      const lines = arSection.split("\n").filter((l) => l.includes("لواد"));
      expect(
        lines,
        `${name} Arabic copy contains transliterated "لواد": ${lines.join("; ")}`,
      ).toHaveLength(0);
    }
  });
});

describe("proper name non-translation contracts", () => {
  it("English appCopy does not translate French business names in chips", () => {
    const appDemo = read(appDemoPath);

    // Extract FR chips
    const frChipsMatch = appDemo.match(
      /fr:\s*\{[\s\S]*?chips:\s*\[(.*?)\]/,
    );
    expect(frChipsMatch).not.toBeNull();
    const frChips = frChipsMatch![1];

    // Extract EN chips
    const enChipsMatch = appDemo.match(
      /en:\s*\{[\s\S]*?chips:\s*\[(.*?)\]/,
    );
    expect(enChipsMatch).not.toBeNull();
    const enChips = enChipsMatch![1];

    // "Bankily" is a proper name — must not be translated.
    expect(frChips).toContain("Bankily");
    expect(enChips).toContain("Bankily");
  });

  it("Arabic search chips keep Bankily as Bankily, not transliterated", () => {
    const appDemo = read(appDemoPath);

    // Find the Arabic chips array.
    const arChipsMatch = appDemo.match(
      /ar:\s*\{[\s\S]*?chips:\s*\[(.*?)\]/,
    );
    expect(arChipsMatch).not.toBeNull();

    const arChips = arChipsMatch![1];

    // "Bankily" is a proper name — must not be transliterated to بنكيلي.
    expect(arChips).toContain("Bankily");
    expect(arChips).not.toContain("بنكيلي");
  });

  it("Arabic demo query placeholder keeps Bankily as Bankily", () => {
    const appDemo = read(appDemoPath);

    // The Arabic placeholder must reference "Bankily" not "بنكيلي".
    const arPlaceholderMatch = appDemo.match(
      /ar:\s*\{[\s\S]*?placeholder:\s*["'](.*?)["']/,
    );
    expect(arPlaceholderMatch).not.toBeNull();
    expect(arPlaceholderMatch![1]).toContain("Bankily");
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
