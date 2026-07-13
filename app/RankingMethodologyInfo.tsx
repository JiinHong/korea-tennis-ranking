import { Info } from "lucide-react";
import Link from "next/link";

export default function RankingMethodologyInfo() {
  return (
    <div className="ranking-methodology-info">
      <span
        aria-describedby="ranking-methodology-tooltip"
        aria-label="랭킹 산정 방식 안내"
        className="ranking-methodology-trigger"
        role="img"
        tabIndex={0}
      >
        <Info aria-hidden="true" />
      </span>

      <div
        className="ranking-methodology-tooltip"
        data-testid="ranking-methodology-tooltip"
        id="ranking-methodology-tooltip"
      >
        <p>
          대회 성적에 진출 단계, 대회 위상, 참가 규모, 최근 연도 가중치를
          적용합니다.
        </p>
        <p>같은 동아리의 여러 팀 중 가장 좋은 성적만 반영합니다.</p>
        <p>
          WEMIX OPEN 2025는 전체 대진 검증 전이라 현재 점수에서 제외합니다.
        </p>
        <Link href="/methodology">자세히 보기</Link>
      </div>
    </div>
  );
}
