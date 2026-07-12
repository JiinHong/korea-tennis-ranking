import "server-only";

import type { AdminRankAdjustmentChange } from "@/lib/adminRankAdjustment";
import type { PlayerStatus } from "@/lib/rankingRules";
import { getSupabaseReadClient } from "@/lib/supabaseServer";

type AdminPlayerMutationBase = {
  clubSlug: string;
  adminSecret: string;
};

export type AdminPlayerMutation =
  | (AdminPlayerMutationBase & {
      action: "add";
      name: string;
    })
  | (AdminPlayerMutationBase & {
      action: "rename";
      seasonPlayerId: string;
      name: string;
    })
  | (AdminPlayerMutationBase & {
      action: "status";
      seasonPlayerId: string;
      status: PlayerStatus;
    })
  | (AdminPlayerMutationBase & {
      action: "rank";
      seasonPlayerId: string;
      targetRank: number;
    });

type AdminPlayerMutationResultBase = {
  seasonPlayerId: string;
  playerId: string;
  name: string;
  rank: number;
  status: PlayerStatus;
};

export type AdminPlayerMutationResult =
  | (AdminPlayerMutationResultBase & {
      action: "add" | "rename" | "status";
    })
  | (AdminPlayerMutationResultBase & {
      action: "rank";
      oldRank: number;
      changes: AdminRankAdjustmentChange[];
    });

export type SupabaseAdminPlayerCommandAdapter = {
  mutate(input: AdminPlayerMutation): Promise<AdminPlayerMutationResult>;
};

type AdminPlayerRpcClient = {
  rpc(
    functionName: string,
    params: Record<string, unknown>
  ): PromiseLike<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};

export class AdminPlayerCommandError extends Error {
  constructor(
    public readonly kind: "forbidden" | "validation",
    message: string
  ) {
    super(message);
    this.name = "AdminPlayerCommandError";
  }
}

function isPlayerStatus(value: unknown): value is PlayerStatus {
  return ["active", "injured", "inactive", "left"].includes(String(value));
}

function isRankChange(value: unknown): value is AdminRankAdjustmentChange {
  if (!value || typeof value !== "object") return false;

  const row = value as Record<string, unknown>;

  return (
    typeof row.seasonPlayerId === "string" &&
    typeof row.name === "string" &&
    typeof row.oldRank === "number" &&
    typeof row.newRank === "number"
  );
}

function isMutationResult(value: unknown): value is AdminPlayerMutationResult {
  if (!value || typeof value !== "object") return false;

  const row = value as Record<string, unknown>;

  const hasCommonFields =
    typeof row.seasonPlayerId === "string" &&
    typeof row.playerId === "string" &&
    typeof row.name === "string" &&
    typeof row.rank === "number" &&
    isPlayerStatus(row.status);

  if (!hasCommonFields) return false;

  if (row.action === "rank") {
    return (
      typeof row.oldRank === "number" &&
      Array.isArray(row.changes) &&
      row.changes.every(isRankChange)
    );
  }

  return ["add", "rename", "status"].includes(String(row.action));
}

export async function manageAdminPlayer(
  input: AdminPlayerMutation,
  adapter: SupabaseAdminPlayerCommandAdapter =
    createSupabaseAdminPlayerCommandAdapter()
): Promise<AdminPlayerMutationResult> {
  return adapter.mutate(input);
}

export function createSupabaseAdminPlayerCommandAdapter(
  supabase: AdminPlayerRpcClient = getSupabaseReadClient()
): SupabaseAdminPlayerCommandAdapter {
  return {
    async mutate(input) {
      const rpcParameters = {
        p_action: input.action,
        p_club_slug: input.clubSlug,
        p_season_player_id:
          input.action === "add" ? null : input.seasonPlayerId,
        p_name:
          input.action === "add" || input.action === "rename"
            ? input.name
            : null,
        p_status: input.action === "status" ? input.status : null,
        p_admin_secret: input.adminSecret,
      };
      const { data, error } = await supabase.rpc(
        "manage_admin_player_with_secret",
        input.action === "rank"
          ? { ...rpcParameters, p_target_rank: input.targetRank }
          : rpcParameters
      );

      if (error) {
        if (error.code !== "42501" && !["22023", "23505"].includes(error.code ?? "")) {
          throw new Error("선수 관리 작업을 저장하지 못했습니다.");
        }

        throw new AdminPlayerCommandError(
          error.code === "42501" ? "forbidden" : "validation",
          error.message
        );
      }

      if (!isMutationResult(data)) {
        throw new Error("선수 관리 결과를 확인하지 못했습니다.");
      }

      return data;
    },
  };
}
