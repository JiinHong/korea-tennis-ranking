import "server-only";

import { getSupabaseReadClient } from "@/lib/supabaseServer";

type AdminMatchMutationBase = {
  clubSlug: string;
  matchId: string;
  adminSecret: string;
};

export type AdminMatchMutation =
  | (AdminMatchMutationBase & {
      action: "edit";
      player1Id: string;
      player2Id: string;
      player1Score: number;
      player2Score: number;
      playedOn: string;
    })
  | (AdminMatchMutationBase & { action: "void" | "restore" });

export type AdminMatchMutationResult = {
  action: AdminMatchMutation["action"];
  matchId: string;
  status: "confirmed" | "voided";
  rankingsRecalculated: true;
};

export type SupabaseAdminMatchCommandAdapter = {
  mutate(input: AdminMatchMutation): Promise<AdminMatchMutationResult>;
};

type AdminMatchRpcClient = {
  rpc(
    functionName: string,
    params: Record<string, unknown>
  ): PromiseLike<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
};

export class AdminMatchCommandError extends Error {
  constructor(
    public readonly kind: "forbidden" | "validation",
    message: string
  ) {
    super(message);
    this.name = "AdminMatchCommandError";
  }
}

function isMutationResult(value: unknown): value is AdminMatchMutationResult {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;

  return (
    ["edit", "void", "restore"].includes(String(row.action)) &&
    typeof row.matchId === "string" &&
    ["confirmed", "voided"].includes(String(row.status)) &&
    row.rankingsRecalculated === true
  );
}

export async function manageAdminMatch(
  input: AdminMatchMutation,
  adapter: SupabaseAdminMatchCommandAdapter =
    createSupabaseAdminMatchCommandAdapter()
): Promise<AdminMatchMutationResult> {
  return adapter.mutate(input);
}

export function createSupabaseAdminMatchCommandAdapter(
  supabase: AdminMatchRpcClient = getSupabaseReadClient()
): SupabaseAdminMatchCommandAdapter {
  return {
    async mutate(input) {
      const isEdit = input.action === "edit";
      const { data, error } = await supabase.rpc(
        "manage_admin_match_with_secret",
        {
          p_action: input.action,
          p_club_slug: input.clubSlug,
          p_match_id: input.matchId,
          p_player1_id: isEdit ? input.player1Id : null,
          p_player2_id: isEdit ? input.player2Id : null,
          p_player1_score: isEdit ? input.player1Score : null,
          p_player2_score: isEdit ? input.player2Score : null,
          p_played_on: isEdit ? input.playedOn : null,
          p_admin_secret: input.adminSecret,
        }
      );

      if (error) {
        if (error.code !== "42501" && !["22023", "23505"].includes(error.code ?? "")) {
          throw new Error("경기 관리 작업을 저장하지 못했습니다.");
        }

        throw new AdminMatchCommandError(
          error.code === "42501" ? "forbidden" : "validation",
          error.message
        );
      }

      if (!isMutationResult(data)) {
        throw new Error("경기 관리 결과를 확인하지 못했습니다.");
      }

      return data;
    },
  };
}
