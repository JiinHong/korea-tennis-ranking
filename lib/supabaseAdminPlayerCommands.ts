import "server-only";

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
    });

export type AdminPlayerMutationResult = {
  action: AdminPlayerMutation["action"];
  seasonPlayerId: string;
  playerId: string;
  name: string;
  rank: number;
  status: PlayerStatus;
};

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

function isMutationResult(value: unknown): value is AdminPlayerMutationResult {
  if (!value || typeof value !== "object") return false;

  const row = value as Record<string, unknown>;

  return (
    ["add", "rename", "status"].includes(String(row.action)) &&
    typeof row.seasonPlayerId === "string" &&
    typeof row.playerId === "string" &&
    typeof row.name === "string" &&
    typeof row.rank === "number" &&
    isPlayerStatus(row.status)
  );
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
      const { data, error } = await supabase.rpc(
        "manage_admin_player_with_secret",
        {
          p_action: input.action,
          p_club_slug: input.clubSlug,
          p_season_player_id:
            input.action === "add" ? null : input.seasonPlayerId,
          p_name: input.action === "status" ? null : input.name,
          p_status: input.action === "status" ? input.status : null,
          p_admin_secret: input.adminSecret,
        }
      );

      if (error) {
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
