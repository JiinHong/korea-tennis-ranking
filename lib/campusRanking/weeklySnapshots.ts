const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 주간 순위 비교의 기준이 되는 한국시간 월요일 날짜를 반환합니다.
 * Date의 UTC 필드를 한국시간처럼 다루면 서버가 어느 리전에 있어도
 * 같은 주간 기준일을 계산할 수 있습니다.
 */
export function getKstWeekStart(now = new Date()): string {
  const kstDate = new Date(now.getTime() + KST_OFFSET_MS);
  const daysSinceMonday = (kstDate.getUTCDay() + 6) % 7;

  kstDate.setUTCDate(kstDate.getUTCDate() - daysSinceMonday);

  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kstDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
