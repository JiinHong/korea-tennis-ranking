import "server-only";

import { getSupabaseReadClient } from "@/lib/supabaseServer";

const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

export type MonthlyAutomationRunStatus =
  | "succeeded"
  | "skipped"
  | "failed";

export type AdminMonthlyAutomationRun = {
  id: string;
  clubId: string;
  seasonId: string;
  targetMonth: string;
  status: MonthlyAutomationRunStatus;
  settlementId: string | null;
  errorCode: string | null;
  publicMessage: string;
  executedAt: string;
};

export type AdminMonthlyAutomationStatus = {
  available: boolean;
  nextRunAt: string;
  latestByClubId: Record<string, AdminMonthlyAutomationRun>;
};

export type MonthlyAutomationRunRow = Omit<
  AdminMonthlyAutomationRun,
  "targetMonth"
> & {
  targetMonth: string;
};

export type SupabaseMonthlyAutomationStatusAdapter = {
  listRuns(): Promise<MonthlyAutomationRunRow[]>;
};

export function calculateNextMonthlySettlementRun(now: Date): string {
  if (Number.isNaN(now.getTime())) {
    throw new Error("자동 정산 기준 시각이 올바르지 않습니다.");
  }

  const seoulNow = new Date(now.getTime() + SEOUL_OFFSET_MS);
  const year = seoulNow.getUTCFullYear();
  const month = seoulNow.getUTCMonth();
  const thisMonthRun =
    Date.UTC(year, month, 1, 0, 10) - SEOUL_OFFSET_MS;
  const nextRun =
    now.getTime() < thisMonthRun
      ? thisMonthRun
      : Date.UTC(year, month + 1, 1, 0, 10) - SEOUL_OFFSET_MS;

  return new Date(nextRun).toISOString();
}

export function createUnavailableMonthlyAutomationStatus(
  now = new Date()
): AdminMonthlyAutomationStatus {
  return {
    available: false,
    nextRunAt: calculateNextMonthlySettlementRun(now),
    latestByClubId: {},
  };
}

export async function getAdminMonthlyAutomationStatus(
  adapter: SupabaseMonthlyAutomationStatusAdapter =
    createSupabaseMonthlyAutomationStatusAdapter(),
  now = new Date()
): Promise<AdminMonthlyAutomationStatus> {
  const rows = await adapter.listRuns();
  const latestByClubId: Record<string, AdminMonthlyAutomationRun> = {};

  for (const row of rows) {
    const current = latestByClubId[row.clubId];

    if (
      current &&
      new Date(current.executedAt).getTime() >= new Date(row.executedAt).getTime()
    ) {
      continue;
    }

    latestByClubId[row.clubId] = {
      ...row,
      targetMonth: row.targetMonth.slice(0, 7),
    };
  }

  return {
    available: true,
    nextRunAt: calculateNextMonthlySettlementRun(now),
    latestByClubId,
  };
}

export function createSupabaseMonthlyAutomationStatusAdapter(): SupabaseMonthlyAutomationStatusAdapter {
  const supabase = getSupabaseReadClient();

  return {
    async listRuns() {
      const { data, error } = await supabase
        .from("latest_monthly_settlement_automation_runs")
        .select(
          "id, club_id, season_id, target_month, status, settlement_id, error_code, public_message, executed_at"
        )
        .order("executed_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row) => ({
        id: row.id,
        clubId: row.club_id,
        seasonId: row.season_id,
        targetMonth: row.target_month,
        status: row.status as MonthlyAutomationRunStatus,
        settlementId: row.settlement_id,
        errorCode: row.error_code,
        publicMessage: row.public_message,
        executedAt: row.executed_at,
      }));
    },
  };
}
