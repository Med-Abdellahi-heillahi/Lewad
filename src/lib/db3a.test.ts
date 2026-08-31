import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => {
  const eq = vi.fn();
  const inFilter = vi.fn(() => ({ eq }));
  const select = vi.fn(() => ({ in: inFilter }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn();

  return { eq, from, inFilter, rpc, select };
});

vi.mock("./supabaseClient", () => ({
  supabase: {
    from: supabaseMocks.from,
    rpc: supabaseMocks.rpc,
  },
}));

import {
  hydrateApprovedClientSearchPlaceTypes,
  searchServicesWithCredit,
} from "./db3a";

const paidSuccess = {
  ok: true,
  status: "success",
  message: null,
  balance: 8,
  unlimited: false,
  debited_points: 1,
  results_count: 2,
  search_log_id: "search-log-1",
  results: [
    {
      id: "place-1",
      name: "Akjoujt",
      name_ar: "أكجوجت",
      slug: "akjoujt",
      description: null,
      phone: null,
      whatsapp: null,
      website: null,
      is_verified: true,
      category: null,
      branches: [],
    },
    {
      id: "business-1",
      name: "Hotel Akjoujt",
      name_ar: null,
      slug: "hotel-akjoujt",
      description: null,
      phone: "22123456",
      whatsapp: null,
      website: null,
      is_verified: false,
      category: null,
      branches: [],
    },
  ],
};

describe("paid client search metadata hydration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.rpc.mockResolvedValue({ data: paidSuccess, error: null });
  });

  it("hydrates only returned approved IDs and rejects unknown type keys", async () => {
    supabaseMocks.eq.mockResolvedValue({
      data: [
        { id: "place-1", place_types: ["moughataa", "public", "invalid"] },
        { id: "business-1", place_types: ["establishment", "private"] },
        { id: "not-returned", place_types: ["wilaya"] },
      ],
      error: null,
    });

    const paid = await searchServicesWithCredit("Akjoujt");
    const hydrated = await hydrateApprovedClientSearchPlaceTypes(paid.results);

    expect(supabaseMocks.rpc).toHaveBeenCalledOnce();
    expect(supabaseMocks.rpc).toHaveBeenCalledWith(
      "search_services_with_credit",
      { p_query: "Akjoujt" },
    );
    expect(supabaseMocks.from).toHaveBeenCalledOnce();
    expect(supabaseMocks.from).toHaveBeenCalledWith("establishments");
    expect(supabaseMocks.select).toHaveBeenCalledWith("id, place_types");
    expect(supabaseMocks.inFilter).toHaveBeenCalledWith("id", [
      "place-1",
      "business-1",
    ]);
    expect(supabaseMocks.eq).toHaveBeenCalledWith("status", "approved");
    expect(hydrated[0].place_types).toEqual(["moughataa", "public"]);
    expect(hydrated[0].name_ar).toBe("أكجوجت");
    expect(hydrated[1].place_types).toEqual(["establishment", "private"]);
    expect(paid.balance).toBe(8);
    expect(paid.debitedPoints).toBe(1);
    expect(paid.searchLogId).toBe("search-log-1");
  });

  it("preserves paid results when optional hydration fails", async () => {
    supabaseMocks.eq.mockResolvedValue({ data: null, error: { message: "RLS" } });

    const paid = await searchServicesWithCredit("Akjoujt");
    const hydrated = await hydrateApprovedClientSearchPlaceTypes(paid.results);

    expect(hydrated).toEqual(paid.results);
    expect(hydrated.map(({ place_types }) => place_types)).toEqual([[], []]);
    expect(supabaseMocks.rpc).toHaveBeenCalledOnce();
  });

  it("skips the metadata read when there are no paid results", async () => {
    const hydrated = await hydrateApprovedClientSearchPlaceTypes([]);

    expect(hydrated).toEqual([]);
    expect(supabaseMocks.from).not.toHaveBeenCalled();
    expect(supabaseMocks.rpc).not.toHaveBeenCalled();
  });
});
