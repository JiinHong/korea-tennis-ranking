import Image from "next/image";
import Link from "next/link";

const activeCampusRankings = [
  {
    href: "/petc",
    label: "고려대 PETC 단식 랭킹",
    logoClassName: "is-petc",
    logoHeight: 451,
    logoSrc: "/petc-logo.png",
    logoWidth: 547,
  },
  {
    href: "/seoultech",
    label: "서울과기대 느티나무 단식 랭킹",
    logoClassName: "is-seoultech",
    logoHeight: 395,
    logoSrc: "/seoultech-symbol.png",
    logoWidth: 576,
  },
] as const;

export default function CampusRankingPromotion() {
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
            <span>{ranking.label}</span>
            <span aria-hidden="true" className="national-campus-ranking-arrow">
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
