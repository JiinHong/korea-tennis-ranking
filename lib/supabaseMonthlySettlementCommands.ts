import "server-only";

import { getSupabaseReadClient } from "@/lib/supabaseServer";

export type AdminMonthlySettlementCommand = {
  clubSlug: string;
  targetMonth: string;
  adminSecret: string;
};

type RankSnapshot = {
  playerId: string;
  rank: number;
};

export type AdminMonthlySettlementCommandResult = {
  settlementId: string;
  targetMonth: string;
  penaltyDrop: number;
  targetPlayerIds: string[];
  rankBefore: RankSnapshot[];
  rankAfter: RankSnapshot[];
};

export type SupabaseMonthlySettlementCommandAdapter = {
  apply(
    input: AdminMonthlySettlementCommand
  ): Promise<AdminMonthlySettlementCommandResult>;
};

type MonthlySettlementRpcClient = {
  rpc(
    functionName: string,
    params: Record<string, unknown>
  ): PromiseLike<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};

export class AdminMonthlySettlementCommandError extends Error {
  constructor(
    public readonly kind: "forbidden" | "validation",
    message: string
  ) {
    super(message);
    this.name = "AdminMonthlySettlementCommandError";
  }
}

function isRankSnapshot(value: unknown): value is RankSnapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.playerId === "string" && typeof row.rank === "number";
}

function isCommandResult(
  value: unknown
): value is AdminMonthlySettlementCommandResult {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;

  return (
    typeof row.settlementId === "string" &&
    typeof row.targetMonth === "string" &&
    typeof row.penaltyDrop === "number" &&
    Array.isArray(row.targetPlayerIds) &&
    row.targetPlayerIds.every((id) => typeof id === "string") &&
    Array.isArray(row.rankBefore) &&
    row.rankBefore.every(isRankSnapshot) &&
    Array.isArray(row.rankAfter) &&
    row.rankAfter.every(isRankSnapshot)
  );
}

export async function applyAdminMonthlySettlement(
  input: AdminMonthlySettlementCommand,
  adapter: SupabaseMonthlySettlementCommandAdapter =
    createSupabaseMonthlySettlementCommandAdapter()
): Promise<AdminMonthlySettlementCommandResult> {
  return adapter.apply(input);
}

export function createSupabaseMonthlySettlementCommandAdapter(
  supabase: MonthlySettlementRpcClient = getSupabaseReadClient()
): SupabaseMonthlySettlementCommandAdapter {
  return {
    async apply(input) {
      const { data, error } = await supabase.rpc(
        "apply_monthly_penalty_with_secret",
        {
          p_club_slug: input.clubSlug,
          p_target_month: `${input.targetMonth}-01`,
          p_admin_secret: input.adminSecret,
        }
      );

      if (error) {
        if (error.code === "23505") {
          if (error.message === "이미 정산이 완료된 월입니다.") {
            throw new AdminMonthlySettlementCommandError(
              "validation",
              error.message
            );
          }

          throw new Error("월간 정산 데이터가 충돌했습니다.");
        }

        if (error.code !== "42501" && error.code !== "22023") {
          throw new Error("월간 정산을 적용하지 못했습니다.");
        }

        throw new AdminMonthlySettlementCommandError(
          error.code === "42501" ? "forbidden" : "validation",
          error.message
        );
      }

      if (!isCommandResult(data)) {
        throw new Error("월간 정산 결과를 확인하지 못했습니다.");
      }

      return data;
    },
  };
}
