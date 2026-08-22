import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appPagesPath = new URL("../src/components/AppPages.tsx", import.meta.url);
const clientEstPath = new URL("../src/lib/clientEstablishments.ts", import.meta.url);

function read(url: URL) {
  return readFileSync(url, "utf8").replaceAll("\r\n", "\n");
}

describe("stats button in establishment cards", () => {
  it("establishment card renders a viewStats button", () => {
    const src = read(appPagesPath);
    expect(src).toContain("text.viewStats");
    expect(src).toContain("viewStats");
  });

  it("stats panel is rendered inside EstablishmentCard", () => {
    const src = read(appPagesPath);
    expect(src).toContain("ClientEstablishmentStatsPanel");
    expect(src).toContain("statsOpen");
  });
});

describe("no raw IDs exposed in stats panel", () => {
  it("stats panel does not render establishment.id", () => {
    const src = read(appPagesPath);
    const panelStart = src.indexOf("function ClientEstablishmentStatsPanel(");
    expect(panelStart).toBeGreaterThan(-1);
    const panelEnd = src.indexOf("\nfunction IdentityCard", panelStart);
    const panelBody = src.slice(panelStart, panelEnd);
    expect(panelBody).not.toContain("item.id");
    expect(panelBody).not.toContain(".id}");
    expect(panelBody).not.toContain("establishment_id");
  });
});

describe("missing fields helper contracts", () => {
  it("getMissingEstablishmentFields exists and checks required fields", () => {
    const src = read(appPagesPath);
    expect(src).toContain("function getMissingEstablishmentFields");
    expect(src).toContain("text.fieldName");
    expect(src).toContain("text.fieldCategory");
    expect(src).toContain("text.fieldPhone");
    expect(src).toContain("text.fieldWhatsapp");
    expect(src).toContain("text.fieldLocation");
    expect(src).toContain("text.fieldCoordinates");
  });

  it("website is not in missing fields logic", () => {
    const src = read(appPagesPath);
    const fnStart = src.indexOf("function getMissingEstablishmentFields(");
    const fnEnd = src.indexOf("\nfunction renewalDaysLeft", fnStart);
    const fnBody = src.slice(fnStart, fnEnd);
    expect(fnBody).not.toContain("submissionWebsite");
    expect(fnBody).not.toContain("website");
  });
});

describe("renewal calculation contracts", () => {
  it("renewalDaysLeft uses approvedAt with fallback to createdAt", () => {
    const src = read(appPagesPath);
    const fnStart = src.indexOf("function renewalDaysLeft(");
    const fnEnd = src.indexOf("\nfunction ClientEstablishmentStatsPanel", fnStart);
    const fnBody = src.slice(fnStart, fnEnd);
    expect(fnBody).toContain("approvedAt");
    expect(fnBody).toContain("createdAt");
    expect(fnBody).toContain("subscriptionPeriodMonths");
  });

  it("renewal handles expired and missing dates", () => {
    const src = read(appPagesPath);
    expect(src).toContain("renewalNeeded");
    expect(src).toContain("renewalUnavailable");
  });
});

describe("no fake metrics", () => {
  it("searchAppearances null shows fallback copy", () => {
    const src = read(appPagesPath);
    expect(src).toContain("searchAppearances !== null");
    expect(src).toContain("text.statsUnavailable");
  });

  it("clientEstablishments.ts type has searchAppearances as nullable", () => {
    const src = read(clientEstPath);
    expect(src).toContain("searchAppearances: number | null");
  });
});

describe("owner-scoped RPC contracts", () => {
  it("uses only get_my_establishments_with_stats RPC", () => {
    const src = read(clientEstPath);
    expect(src).toContain("get_my_establishments_with_stats");
    expect(src).not.toContain("admin_");
    expect(src).not.toContain("service_role");
  });

  it("ClientEstablishment type includes approvedAt", () => {
    const src = read(clientEstPath);
    expect(src).toContain("approvedAt: string | null");
  });

  it("readItem parses approved_at and submission_website", () => {
    const src = read(clientEstPath);
    expect(src).toContain("approved_at");
    expect(src).toContain("submission_website");
  });
});

describe("security constraints", () => {
  it("no service_role in frontend code", () => {
    const src = read(appPagesPath);
    expect(src).not.toContain("service_role");
  });

  it("no admin audit logs in stats panel", () => {
    const src = read(appPagesPath);
    const panelStart = src.indexOf("function ClientEstablishmentStatsPanel(");
    const panelEnd = src.indexOf("\nfunction IdentityCard", panelStart);
    const panelBody = src.slice(panelStart, panelEnd);
    expect(panelBody).not.toContain("admin_note");
    expect(panelBody).not.toContain("audit");
    expect(panelBody).not.toContain("rejection_reason");
  });
});

describe("i18n keys for stats panel", () => {
  const requiredKeys = [
    "viewStats", "statsTitle", "days", "timeRemaining", "renewalNeeded",
    "renewalUnavailable", "profileComplete", "infoToComplete", "fieldName",
    "fieldCategory", "fieldPhone", "fieldWhatsapp", "fieldLocation",
    "fieldCoordinates", "statusLabel", "subscriptionLabel", "branchesLabel",
    "verified", "notVerified", "perPeriod",
  ];

  function extractLocale(src: string, startMarker: string, endMarker: string) {
    const s = src.indexOf(startMarker);
    const e = src.indexOf(endMarker, s + startMarker.length);
    return src.slice(s, e);
  }

  it("FR dictionary contains all stats panel keys", () => {
    const src = read(appPagesPath);
    const frSection = extractLocale(src, "fr: {", "ar: {");
    for (const key of requiredKeys) {
      expect(frSection, `FR missing key: ${key}`).toContain(key);
    }
  });

  it("AR dictionary contains all stats panel keys", () => {
    const src = read(appPagesPath);
    const arSection = extractLocale(src, "ar: {", "en: {");
    for (const key of requiredKeys) {
      expect(arSection, `AR missing key: ${key}`).toContain(key);
    }
  });

  it("EN dictionary contains all stats panel keys", () => {
    const src = read(appPagesPath);
    const enStart = src.indexOf("en: {");
    const enEnd = src.indexOf("} as const", enStart);
    const enSection = src.slice(enStart, enEnd);
    for (const key of requiredKeys) {
      expect(enSection, `EN missing key: ${key}`).toContain(key);
    }
  });
});

describe("migration contract", () => {
  it("migration file exists with approved_at in RPC", () => {
    const migrationPath = new URL(
      "../supabase/migrations/20260821000007_client_establishment_stats_details.sql",
      import.meta.url,
    );
    const src = read(migrationPath);
    expect(src).toContain("approved_at");
    expect(src).toContain("submission.website");
    expect(src).toContain("get_my_establishments_with_stats");
    expect(src).toContain("security definer");
    expect(src).toContain("auth.uid()");
    expect(src).not.toContain("is_admin()");
    expect(src).not.toContain("service_role");
  });
});