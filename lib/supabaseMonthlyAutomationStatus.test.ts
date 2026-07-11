import { describe, expect, it, vi } from "vitest";

const supabaseFrom = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabaseServer", () => ({
  getSupabaseReadClient: () => ({ from: supabaseFrom }),
}));

import {
  calculateNextMonthlySettlementRun,
  createSupabaseMonthlyAutomationStatusAdapter,
  getAdminMonthlyAutomationStatus,
  type SupabaseMonthlyAutomationStatusAdapter,
} from "@/lib/supabaseMonthlyAutomationStatus";

describe("calculateNextMonthlySettlementRun", () => {
  it("returns the upcoming first day at 00:10 KST during a month", () => {
    expect(
      calculateNextMonthlySettlementRun(new Date("2026-07-11T03:00:00.000Z"))
    ).toBe("2026-07-31T15:10:00.000Z");
  });

  it("keeps the same first day when the run is still five minutes away", () => {
    expect(
      calculateNextMonthlySettlementRun(new Date("2026-07-31T15:05:00.000Z"))
    ).toBe("2026-07-31T15:10:00.000Z");
  });

  it("moves to the following month after the first-day run time", () => {
    expect(
      calculateNextMonthlySettlementRun(new Date("2026-07-31T15:11:00.000Z"))
    ).toBe("2026-08-31T15:10:00.000Z");
  });

  it("handles a year rollover in Seoul", () => {
    expect(
      calculateNextMonthlySettlementRun(new Date("2026-12-31T16:00:00.000Z"))
    ).toBe("2027-01-31T15:10:00.000Z");
  });
});

describe("createSupabaseMonthlyAutomationStatusAdapter", () => {
  it("does not truncate run history before grouping by club", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const select = vi.fn().mockReturnValue({ order });
    supabaseFrom.mockReturnValueOnce({ select });

    const adapter = createSupabaseMonthlyAutomationStatusAdapter();

    await expect(adapter.listRuns()).resolves.toEqual([]);
    expect(supabaseFrom).toHaveBeenCalledWith(
      "latest_monthly_settlement_automation_runs"
    );
    expect(order).toHaveBeenCalledWith("executed_at", { ascending: false });
  });
});

describe("getAdminMonthlyAutomationStatus", () => {
  it("returns no latest runs before the first automatic settlement", async () => {
    const adapter: SupabaseMonthlyAutomationStatusAdapter = {
      listRuns: vi.fn().mockResolvedValue([]),
    };

    await expect(
      getAdminMonthlyAutomationStatus(
        adapter,
        new Date("2026-07-11T03:00:00.000Z")
      )
    ).resolves.toEqual({
      available: true,
      nextRunAt: "2026-07-31T15:10:00.000Z",
      latestByClubId: {},
    });
  });

  it("keeps the most recent sanitized outcome for each club", async () => {
    const adapter: SupabaseMonthlyAutomationStatusAdapter = {
      listRuns: vi.fn().mockResolvedValue([
        {
          id: "run-old",
          clubId: "club-seoultech",
          seasonId: "season-3",
          targetMonth: "2026-06-01",
          status: "failed",
          settlementId: null,
          errorCode: "22023",
          publicMessage: "안전한 실패 안내",
          executedAt: "2026-07-01T00:00:00.000Z",
        },
        {
          id: "run-petc",
          clubId: "club-petc",
          seasonId: "season-petc",
          targetMonth: "2026-07-01",
          status: "skipped",
          settlementId: "settlement-petc",
          errorCode: null,
          publicMessage: "이미 정산되어 건너뛰었습니다.",
          executedAt: "2026-08-01T00:00:00.000Z",
        },
        {
          id: "run-new",
          clubId: "club-seoultech",
          seasonId: "season-3",
          targetMonth: "2026-07-01",
          status: "succeeded",
          settlementId: "settlement-seoultech",
          errorCode: null,
          publicMessage: "자동 정산을 완료했습니다.",
          executedAt: "2026-08-01T00:00:00.000Z",
        },
      ]),
    };

    const result = await getAdminMonthlyAutomationStatus(
      adapter,
      new Date("2026-08-02T00:00:00.000Z")
    );

    expect(result.latestByClubId["club-seoultech"]).toMatchObject({
      id: "run-new",
      targetMonth: "2026-07",
      status: "succeeded",
    });
    expect(result.latestByClubId["club-petc"]).toMatchObject({
      id: "run-petc",
      targetMonth: "2026-07",
      status: "skipped",
    });
  });
});
