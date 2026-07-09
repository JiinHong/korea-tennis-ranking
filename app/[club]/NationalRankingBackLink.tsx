const NATIONAL_RANKING_URL = "https://koreatennisranking.com/";

export default function NationalRankingBackLink() {
  return (
    <a
      className="national-back-link"
      href={NATIONAL_RANKING_URL}
      aria-label="전국 대학 랭킹으로 돌아가기"
    >
      <span className="national-back-icon" aria-hidden="true" />
    </a>
  );
}
