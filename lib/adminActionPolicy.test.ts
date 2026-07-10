import { describe, expect, it } from "vitest";

import {
  ADMIN_ACTIONS,
  requiresAdminSecret,
  type AdminAction,
} from "@/lib/adminActionPolicy";

describe("admin action policy", () => {
  it("allows read-only and preview actions without a secret", () => {
    const actions: AdminAction[] = [
      "view_dashboard",
      "view_players",
      "view_matches",
      "view_injuries",
      "view_rules",
      "preview_monthly_penalty",
      "preview_rank_change",
      "export_data",
      "submit_public_match",
      "edit_player_note",
    ];

    expect(actions.every((action) => !requiresAdminSecret(action))).toBe(true);
  });

  it("requires a secret for every data or season mutation", () => {
    const actions: AdminAction[] = [
      "add_player",
      "rename_player",
      "deactivate_player",
      "change_player_status",
      "change_rank",
      "mutate_match",
      "mutate_injury",
      "apply_monthly_penalty",
      "change_season",
      "bulk_import",
      "change_rules",
      "recalculate_season",
    ];

    expect(actions.every(requiresAdminSecret)).toBe(true);
  });

  it("keeps every declared action in exactly one permission group", () => {
    const actionIds = ADMIN_ACTIONS.map((action) => action.id);

    expect(new Set(actionIds).size).toBe(actionIds.length);
    expect(actionIds).toHaveLength(22);
  });
});
