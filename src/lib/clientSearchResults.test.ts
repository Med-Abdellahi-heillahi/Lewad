import { describe, expect, it } from "vitest";
import {
  CLIENT_SEARCH_RESULTS_PER_PAGE,
  formatClientSearchChoiceLocation,
  getAutoSelectedClientSearchResult,
  getClientSearchResultPage,
  rankClientSearchResults,
  shouldOfferClientSearchMapOption,
} from "./clientSearchResults";

type Candidate = {
  id: string;
  name: string;
  name_ar?: string | null;
  slug: string;
  place_types?: Array<"establishment" | "moughataa">;
};

function candidate(id: number, name = `Result ${id}`): Candidate {
  return { id: String(id), name, slug: name.toLowerCase().replaceAll(" ", "-") };
}

describe("client search result selection", () => {
  it("auto-selects one strong exact result", () => {
    const exact = candidate(1, "Hotel Akjoujt");

    expect(
      getAutoSelectedClientSearchResult([exact], 1, "  hotel akjoujt "),
    ).toBe(exact);
  });

  it("keeps a sole partial Akjoujt match in the choice list", () => {
    const hotel = candidate(1, "Hotel Akjoujt");

    expect(
      getAutoSelectedClientSearchResult(
        [hotel],
        1,
        "Akjoujt",
      ),
    ).toBeNull();
    expect(shouldOfferClientSearchMapOption([hotel], 1, "Akjoujt")).toBe(true);
  });

  it("does not use a matching slug to auto-select a partial visible name", () => {
    const partial = { ...candidate(1, "Hotel Akjoujt"), slug: "akjoujt" };

    expect(
      getAutoSelectedClientSearchResult([partial], 1, "Akjoujt"),
    ).toBeNull();
  });

  it("recognizes an exact Arabic name without trusting the slug", () => {
    const exactArabic = {
      ...candidate(1, "Akjoujt"),
      name_ar: "أكجوجت",
      slug: "different-slug",
    };

    expect(
      getAutoSelectedClientSearchResult([exactArabic], 1, "أكجوجت"),
    ).toBe(exactArabic);
  });

  it("keeps a sole exact geographic Akjoujt result in the choice list", () => {
    const place = {
      ...candidate(1, "Akjoujt"),
      place_types: ["moughataa" as const],
    };

    expect(
      getAutoSelectedClientSearchResult([place], 1, "Akjoujt"),
    ).toBeNull();
  });

  it("uses the same harmless Arabic letter folding as the paid search", () => {
    const exactArabic = {
      ...candidate(1, "Arabic place"),
      name_ar: "مدرسة كيهيدي",
    };

    expect(
      getAutoSelectedClientSearchResult([exactArabic], 1, "مدرسه كيهيدي"),
    ).toBe(exactArabic);
  });

  it("never auto-selects when several results exist", () => {
    const internalPlace = candidate(1, "Akjoujt");
    const partialBusiness = candidate(2, "Hotel Akjoujt");
    expect(
      getAutoSelectedClientSearchResult(
        [internalPlace, partialBusiness],
        2,
        "Akjoujt",
      ),
    ).toBeNull();
    expect(getClientSearchResultPage([internalPlace, partialBusiness], 1).items).toEqual([
      internalPlace,
      partialBusiness,
    ]);
  });

  it("trusts both the reported count and parsed rows before auto-selecting", () => {
    expect(
      getAutoSelectedClientSearchResult([candidate(1, "Akjoujt")], 2, "Akjoujt"),
    ).toBeNull();
  });
});

describe("client search result ranking and map alternative", () => {
  it("ranks an exact geographic Akjoujt above a longer business match", () => {
    const hotel = {
      ...candidate(2, "Hotel Akjoujt"),
      place_types: ["establishment" as const],
    };
    const place = {
      ...candidate(1, "Akjoujt"),
      place_types: ["moughataa" as const],
    };
    const original = [hotel, place];

    expect(rankClientSearchResults(original, "Akjoujt")).toEqual([place, hotel]);
    expect(original).toEqual([hotel, place]);
  });

  it("keeps RPC order within equal ranking tiers", () => {
    const first = candidate(1, "Hotel Akjoujt");
    const second = candidate(2, "Pharmacie Akjoujt");

    expect(rankClientSearchResults([first, second], "Akjoujt")).toEqual([
      first,
      second,
    ]);
  });

  it("offers map search when every complete internal result is partial", () => {
    const partials = [
      candidate(1, "Hotel Akjoujt"),
      candidate(2, "Pharmacie Akjoujt"),
    ];

    expect(
      shouldOfferClientSearchMapOption(partials, 2, "Akjoujt"),
    ).toBe(true);
  });

  it("hides map search when an exact internal name is present", () => {
    const matches = [candidate(1, "Akjoujt"), candidate(2, "Hotel Akjoujt")];

    expect(
      shouldOfferClientSearchMapOption(matches, 2, "Akjoujt"),
    ).toBe(false);
  });

  it("fails closed for empty or incompletely parsed internal results", () => {
    expect(shouldOfferClientSearchMapOption([], 0, "Akjoujt")).toBe(false);
    expect(
      shouldOfferClientSearchMapOption(
        [candidate(1, "Hotel Akjoujt")],
        2,
        "Akjoujt",
      ),
    ).toBe(false);
  });
});

describe("client search result choice location", () => {
  it("keeps the city visible when a neighborhood is also available", () => {
    expect(
      formatClientSearchChoiceLocation({
        neighborhood: "Centre",
        city: "Akjoujt",
      }),
    ).toBe("Centre · Akjoujt");
  });

  it("trims values and omits duplicate location parts", () => {
    expect(
      formatClientSearchChoiceLocation({
        neighborhood: " Centre ",
        address: "centre",
        city: " Akjoujt ",
      }),
    ).toBe("Centre · Akjoujt");
  });
});

describe("client search result pagination", () => {
  const results = Array.from({ length: 12 }, (_, index) => candidate(index + 1));

  it("uses exactly five results per page", () => {
    expect(CLIENT_SEARCH_RESULTS_PER_PAGE).toBe(5);
    expect(getClientSearchResultPage(results, 1).items.map(({ id }) => id)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    expect(getClientSearchResultPage(results, 2).items.map(({ id }) => id)).toEqual([
      "6",
      "7",
      "8",
      "9",
      "10",
    ]);
    expect(getClientSearchResultPage(results, 3).items.map(({ id }) => id)).toEqual([
      "11",
      "12",
    ]);
  });

  it("supports previous and next pages without another search", () => {
    const nextPage = getClientSearchResultPage(results, 2);
    const previousPage = getClientSearchResultPage(results, nextPage.page - 1);

    expect(nextPage.page).toBe(2);
    expect(previousPage.page).toBe(1);
    expect(nextPage.totalPages).toBe(3);
  });

  it("clamps invalid and out-of-range pages", () => {
    expect(getClientSearchResultPage(results, Number.NaN).page).toBe(1);
    expect(getClientSearchResultPage(results, 99).page).toBe(3);
  });
});
