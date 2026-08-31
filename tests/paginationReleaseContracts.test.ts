import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8").replaceAll(
    "\r\n",
    "\n",
  );
}

describe("release pagination contracts", () => {
  it("keeps client history at ten items and guards refresh single-flight", () => {
    const historyData = source("../src/lib/userHistory.ts");
    const historyUi = source("../src/components/HistoryPage.tsx");

    expect(historyData).toContain("HISTORY_PAGE_SIZE = 10");
    expect(historyUi).toContain(
      "events.slice(start, start + HISTORY_PAGE_SIZE)",
    );
    expect(historyUi).toContain("if (loadInFlightRef.current) return;");
    expect(historyUi).toContain("disabled={loadInFlight}");
  });

  it("keeps profile establishments in bounded frontend pages", () => {
    const profileUi = source("../src/components/AppPages.tsx");

    expect(profileUi).toContain("CLIENT_ESTABLISHMENTS_PAGE_SIZE = 6");
    expect(profileUi).toContain("paginateItems(items, {");
    expect(profileUi).toContain("paginatedItems.data.map");
    expect(profileUi).toContain("paginatedItems.totalPages > 1");
  });

  it("uses deterministic database ordering for admin discovery pages", () => {
    const adminData = source("../src/lib/admin.ts");
    const discoveryQuery = adminData.slice(
      adminData.indexOf("export async function getAdminExternalPlaceDiscoveries"),
      adminData.indexOf("type DiscoveryRow", adminData.indexOf("export async function getAdminExternalPlaceDiscoveries")),
    );

    expect(discoveryQuery).toContain(".order('created_at', { ascending: false })");
    expect(discoveryQuery).toContain(".order('id', { ascending: false })");
    expect(discoveryQuery).toContain(".range(from, to)");
  });

  it("keeps previous and next disabled at their boundaries and mirrors RTL arrows", () => {
    const controls = source("../src/components/ui/PaginationControls.tsx");

    expect(controls).toContain("disabled={disabled || page <= 1}");
    expect(controls).toContain("disabled={disabled || page >= lastPage}");
    expect(controls.match(/rtl:rotate-180/g)).toHaveLength(2);
  });
});
