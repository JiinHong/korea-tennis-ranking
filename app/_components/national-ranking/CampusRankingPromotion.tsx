import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { CampusRankingPromotionStats } from "@/lib/campusRanking/promotionStats";

const activeCampusRankings = [
  {
    href: "/petc",
    slug: "petc",
    label: "고려대 PETC 단식 랭킹",
    logoClassName: "is-petc",
    logoHeight: 451,
    logoSrc: "/petc-logo.png",
    logoWidth: 547,
  },
  {
    href: "/seoultech",
    slug: "seoultech",
    label: "서울과기대 느티나무 단식 랭킹",
    logoClassName: "is-seoultech",
    logoHeight: 395,
    logoSrc: "/seoultech-symbol.png",
    logoWidth: 576,
  },
] as const;

export default function CampusRankingPromotion({
  matchCounts,
}: {
  matchCounts: CampusRankingPromotionStats;
}) {
  return (
    <section
      aria-labelledby="campus-ranking-promotion-title"
      className="national-campus-ranking-promo"
    >
      <h2 id="campus-ranking-promotion-title">단식 랭킹 운영 중!</h2>

      <a
        className="national-campus-ranking-inquiry"
        href="https://open.kakao.com/o/sFSnlgIi"
        rel="noopener noreferrer"
        target="_blank"
      >
        우리 동아리도 운영해보기 →
      </a>

      <div className="national-campus-ranking-links">
        {activeCampusRankings.map((ranking) => (
          <Link
            aria-label={ranking.label}
            className="national-campus-ranking-link"
            href={ranking.href}
            key={ranking.href}
          >
            <Image
              alt=""
              className={`national-campus-ranking-logo ${ranking.logoClassName}`}
              height={ranking.logoHeight}
              sizes="57px"
              src={ranking.logoSrc}
              width={ranking.logoWidth}
            />
            <span className="national-campus-ranking-label">
              <strong>{ranking.label}</strong>
              {matchCounts[ranking.slug] !== undefined ? (
                <small aria-hidden="true">
                  누적 {matchCounts[ranking.slug]?.toLocaleString("ko-KR")}경기
                </small>
              ) : null}
            </span>
            <span aria-hidden="true" className="national-campus-ranking-arrow">
              <ChevronRight />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
