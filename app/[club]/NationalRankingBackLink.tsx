const NATIONAL_RANKING_URL = "https://koreatennisranking.com/";

export default function NationalRankingBackLink({
  showLabel = false,
  href = NATIONAL_RANKING_URL,
  label: customLabel,
}: {
  showLabel?: boolean;
  href?: string;
  label?: string;
}) {
  const label =
    customLabel ??
    (showLabel
      ? "전국 대학 동아리 랭킹 보러가기"
      : "전국 대학 랭킹으로 돌아가기");

  return (
    <a
      className={`national-back-link${showLabel ? " is-labeled" : ""}`}
      href={href}
      aria-label={label}
    >
      <span className="national-back-icon" aria-hidden="true" />
      {showLabel ? <span className="national-back-label">{label}</span> : null}
    </a>
  );
}
