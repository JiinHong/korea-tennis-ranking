const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 이 값만 14 또는 7로 바꾸면 순위 변동 표시 기간 전체가 함께 바뀐다.
export const RANKING_MOVEMENT_WINDOW_DAYS = 30;

export type RankingMovement = {
  playerId: string;
  rankDelta: number;
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function getKstRollingDateRange(
  now = new Date(),
  days = RANKING_MOVEMENT_WINDOW_DAYS
): { startDate: string; endDate: string } {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error("Ranking movement window must be at least one day");
  }

  // UTC 시각에 9시간을 더한 뒤 UTC 날짜 부분을 읽으면 한국 달력 날짜가 된다.
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  const endTimestamp = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate()
  );

  return {
    startDate: formatDate(endTimestamp - (days - 1) * DAY_MS),
    endDate: formatDate(endTimestamp),
  };
}

export function buildRankChanges(
  movements: RankingMovement[]
): Record<string, number> {
  const totals: Record<string, number> = {};

  for (const movement of movements) {
    totals[movement.playerId] =
      (totals[movement.playerId] ?? 0) + movement.rankDelta;
  }

  return Object.fromEntries(
    Object.entries(totals).filter(([, rankDelta]) => rankDelta !== 0)
  );
}
