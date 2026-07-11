import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  AdminMonthlySettlementCommandError,
  applyAdminMonthlySettlement,
  createSupabaseMonthlySettlementCommandAdapter,
  type SupabaseMonthlySettlementCommandAdapter,
} from "./supabaseMonthlySettlementCommands";

const result = {
  settlementId: "settlement-1",
  targetMonth: "2026-07",
  penaltyDrop: 2,
  targetPlayerIds: ["p1", "p2"],
  rankBefore: [{ playerId: "p1", rank: 1 }],
  rankAfter: [{ playerId: "p1", rank: 3 }],
};

describe("applyAdminMonthlySettlement", () => {
  it("passes the guarded settlement command to the adapter", async () => {
    const adapter: SupabaseMonthlySettlementCommandAdapter = {
      apply: vi.fn().mockResolvedValue(result),
    };

    await expect(
      applyAdminMonthlySettlement(
        {
          clubSlug: "seoultech",
          targetMonth: "2026-07",
          adminSecret: "secret",
        },
        adapter
      )
    ).resolves.toEqual(result);
  });
});

describe("createSupabaseMonthlySettlementCommandAdapter", () => {
  it("maps a month key to the first day expected by the guarded RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: result, error: null });
    const adapter = createSupabaseMonthlySettlementCommandAdapter({ rpc });

    await adapter.apply({
      clubSlug: "seoultech",
      targetMonth: "2026-07",
      adminSecret: "secret",
    });

    expect(rpc).toHaveBeenCalledWith("apply_monthly_penalty_with_secret", {
      p_club_slug: "seoultech",
      p_target_month: "2026-07-01",
      p_admin_secret: "secret",
    });
  });

  it("maps an invalid secret to a forbidden command error", async () => {
    const adapter = createSupabaseMonthlySettlementCommandAdapter({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42501", message: "관리자 비밀키가 올바르지 않습니다." },
      }),
    });

    await expect(
      adapter.apply({
        clubSlug: "seoultech",
        targetMonth: "2026-07",
        adminSecret: "wrong",
      })
    ).rejects.toMatchObject({
      kind: "forbidden",
      message: "관리자 비밀키가 올바르지 않습니다.",
    } satisfies Partial<AdminMonthlySettlementCommandError>);
  });

  it("keeps expected validation errors and hides unexpected database errors", async () => {
    const validationAdapter = createSupabaseMonthlySettlementCommandAdapter({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505", message: "이미 정산이 완료된 월입니다." },
      }),
    });
    const unexpectedAdapter = createSupabaseMonthlySettlementCommandAdapter({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "XX000", message: "private database details" },
      }),
    });
    const unexpectedConstraintAdapter =
      createSupabaseMonthlySettlementCommandAdapter({
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: "23505",
            message: "duplicate key violates private_constraint_name",
          },
        }),
      });
    const input = {
      clubSlug: "seoultech",
      targetMonth: "2026-07",
      adminSecret: "secret",
    };

    await expect(validationAdapter.apply(input)).rejects.toMatchObject({
      kind: "validation",
      message: "이미 정산이 완료된 월입니다.",
    });
    await expect(unexpectedAdapter.apply(input)).rejects.toEqual(
      new Error("월간 정산을 적용하지 못했습니다.")
    );
    await expect(unexpectedConstraintAdapter.apply(input)).rejects.toEqual(
      new Error("월간 정산 데이터가 충돌했습니다.")
    );
  });
});
