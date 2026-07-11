import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AdminMonthlySettlementCommandError,
  applyAdminMonthlySettlement,
} from "@/lib/supabaseMonthlySettlementCommands";
import { getAdminMonthlyClub } from "@/lib/supabaseMonthlySettlements";

import { GET, POST } from "./route";

vi.mock("@/lib/supabaseMonthlySettlementCommands", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/lib/supabaseMonthlySettlementCommands")
  >();
  return { ...original, applyAdminMonthlySettlement: vi.fn() };
});

vi.mock("@/lib/supabaseMonthlySettlements", () => ({
  getAdminMonthlyClub: vi.fn(),
}));

const context = { params: Promise.resolve({ club: "seoultech" }) };
const club = {
  id: "club-1",
  slug: "seoultech",
  name: "서울과기대",
  title: "단식 랭킹",
  season: {
    id: "season-3",
    name: "시즌3",
    startsOn: "2026-07-01",
    endsOn: null,
  },
  penaltyDrop: 2,
  previews: [],
};
const result = {
  settlementId: "settlement-1",
  targetMonth: "2026-07",
  penaltyDrop: 2,
  targetPlayerIds: ["p1"],
  rankBefore: [{ playerId: "p1", rank: 1 }],
  rankAfter: [{ playerId: "p1", rank: 2 }],
};

function request(body: unknown) {
  return new Request(
    "https://example.com/api/admin/clubs/seoultech/monthly-settlements",
    { method: "POST", body: JSON.stringify(body) }
  );
}

describe("GET /api/admin/clubs/[club]/monthly-settlements", () => {
  beforeEach(() => {
    vi.mocked(getAdminMonthlyClub).mockReset();
    vi.mocked(applyAdminMonthlySettlement).mockReset();
  });

  it("returns the open monthly preview without an admin secret", async () => {
    vi.mocked(getAdminMonthlyClub).mockResolvedValue(club);

    const response = await GET(new Request("https://example.com"), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, club });
    expect(getAdminMonthlyClub).toHaveBeenCalledWith("seoultech");
  });

  it("returns 404 before querying an unknown club", async () => {
    const response = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ club: "unknown" }),
    });

    expect(response.status).toBe(404);
    expect(getAdminMonthlyClub).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/clubs/[club]/monthly-settlements", () => {
  beforeEach(() => {
    vi.mocked(getAdminMonthlyClub).mockReset();
    vi.mocked(applyAdminMonthlySettlement).mockReset();
  });

  it("applies a completed month through the guarded command", async () => {
    vi.mocked(applyAdminMonthlySettlement).mockResolvedValue(result);

    const response = await POST(
      request({ targetMonth: "2026-07", adminSecret: "secret" }),
      context
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, settlement: result });
    expect(applyAdminMonthlySettlement).toHaveBeenCalledWith({
      clubSlug: "seoultech",
      targetMonth: "2026-07",
      adminSecret: "secret",
    });
  });

  it("rejects malformed months and missing secrets before calling the command", async () => {
    const invalidMonth = await POST(
      request({ targetMonth: "2026-13", adminSecret: "secret" }),
      context
    );
    const missingSecret = await POST(
      request({ targetMonth: "2026-07", adminSecret: "" }),
      context
    );

    expect(invalidMonth.status).toBe(400);
    expect(missingSecret.status).toBe(400);
    expect(applyAdminMonthlySettlement).not.toHaveBeenCalled();
  });

  it("returns 403 when the admin secret is wrong", async () => {
    vi.mocked(applyAdminMonthlySettlement).mockRejectedValue(
      new AdminMonthlySettlementCommandError(
        "forbidden",
        "관리자 비밀키가 올바르지 않습니다."
      )
    );

    const response = await POST(
      request({ targetMonth: "2026-07", adminSecret: "wrong" }),
      context
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      message: "관리자 비밀키가 올바르지 않습니다.",
    });
  });
});
